import { useCallback, useEffect, useRef, useState } from 'react'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { lineString, point } from '@turf/helpers'
import { bearingBetween, haversineDistance } from '../lib/geo'

const HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
}

const MAX_ACCEPTED_ACCURACY_M = 15
const GPS_BUFFER_SIZE = 5
const MAX_WALKING_SPEED_MPS = 4.5
const MAX_STATIONARY_JUMP_M = 18
const SUDDEN_TURN_MIN_DISTANCE_M = 6
const SUDDEN_TURN_MAX_DELTA_DEG = 135
const KALMAN_PROCESS_NOISE = 0.00001

function mapPosition(pos, source) {
  return {
    coords: [pos.coords.latitude, pos.coords.longitude],
    accuracy: pos.coords.accuracy,
    source,
    timestamp: pos.timestamp,
  }
}

function averageCoordinates(samples) {
  const sums = samples.reduce(
    (total, sample) => [total[0] + sample.coords[0], total[1] + sample.coords[1]],
    [0, 0],
  )

  return [sums[0] / samples.length, sums[1] / samples.length]
}

function angleDelta(previous, next) {
  return Math.abs(((next - previous + 540) % 360) - 180)
}

function createKalmanState(coords, accuracy) {
  return {
    lat: coords[0],
    lng: coords[1],
    variance: Math.max(accuracy, 1) ** 2,
  }
}

function applyKalmanFilter(previous, coords, accuracy) {
  if (!previous) return createKalmanState(coords, accuracy)

  const measurementVariance = Math.max(accuracy, 1) ** 2
  const predictedVariance = previous.variance + KALMAN_PROCESS_NOISE
  const gain = predictedVariance / (predictedVariance + measurementVariance)

  return {
    lat: previous.lat + gain * (coords[0] - previous.lat),
    lng: previous.lng + gain * (coords[1] - previous.lng),
    variance: (1 - gain) * predictedVariance,
  }
}

function coordsToLngLat(coords) {
  return [coords[1], coords[0]]
}

function snapToNearestPath(coords, walkwayPaths) {
  if (!coords || !walkwayPaths?.length) return coords

  const gpsPoint = point(coordsToLngLat(coords))
  let nearest = null

  for (const path of walkwayPaths) {
    if (!path.coordinates || path.coordinates.length < 2) continue

    const snapped = nearestPointOnLine(
      lineString(path.coordinates.map(coordsToLngLat)),
      gpsPoint,
      { units: 'meters' },
    )

    if (
      !nearest ||
      snapped.properties.dist < nearest.properties.dist
    ) {
      nearest = snapped
    }
  }

  if (!nearest) return coords

  const [lng, lat] = nearest.geometry.coordinates
  return [lat, lng]
}

function isUnrealisticReading(previous, next) {
  if (!previous) return false

  const distance = haversineDistance(previous.coords, next.coords)
  const elapsedSeconds = Math.max((next.timestamp - previous.timestamp) / 1000, 1)
  const speed = distance / elapsedSeconds

  if (distance > MAX_STATIONARY_JUMP_M && speed > MAX_WALKING_SPEED_MPS) {
    return true
  }

  if (
    previous.bearing != null &&
    distance >= SUDDEN_TURN_MIN_DISTANCE_M &&
    angleDelta(previous.bearing, bearingBetween(previous.coords, next.coords)) >
      SUDDEN_TURN_MAX_DELTA_DEG
  ) {
    return true
  }

  return false
}

export function useGeolocation(walkwayPaths = []) {
  const geolocationSupported =
    typeof navigator !== 'undefined' && !!navigator.geolocation
  const [position, setPosition] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState(
    geolocationSupported
      ? null
      : 'Geolocation is not supported. Tap the map to set your location manually.',
  )
  const [status, setStatus] = useState(
    geolocationSupported ? 'pending' : 'manual',
  )
  const [source, setSource] = useState(null)

  const watchIdRef = useRef(null)
  const stabilizedRef = useRef(null)
  const rawAcceptedRef = useRef(null)
  const bufferRef = useRef([])
  const kalmanRef = useRef(null)
  const fallbackTimerRef = useRef(null)
  const modeRef = useRef(geolocationSupported ? 'gps' : 'manual')
  const startWatchRef = useRef(null)
  const walkwayPathsRef = useRef(walkwayPaths)

  useEffect(() => {
    walkwayPathsRef.current = walkwayPaths
  }, [walkwayPaths])

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  const applyPosition = useCallback((nextPosition) => {
    if (
      nextPosition.source === 'gps' &&
      nextPosition.accuracy > MAX_ACCEPTED_ACCURACY_M
    ) {
      setStatus('watching')
      return
    }

    const previousRaw = rawAcceptedRef.current
    if (isUnrealisticReading(previousRaw, nextPosition)) return

    const bearing =
      previousRaw && haversineDistance(previousRaw.coords, nextPosition.coords) > 1
        ? bearingBetween(previousRaw.coords, nextPosition.coords)
        : previousRaw?.bearing

    const accepted = { ...nextPosition, bearing }
    rawAcceptedRef.current = accepted
    bufferRef.current = [...bufferRef.current, accepted].slice(-GPS_BUFFER_SIZE)

    const averaged = averageCoordinates(bufferRef.current)
    kalmanRef.current = applyKalmanFilter(
      kalmanRef.current,
      averaged,
      nextPosition.accuracy,
    )

    const filtered = [kalmanRef.current.lat, kalmanRef.current.lng]
    const snapped = snapToNearestPath(filtered, walkwayPathsRef.current)

    stabilizedRef.current = snapped
    setPosition(snapped)
    setAccuracy(nextPosition.accuracy ?? null)
    setSource(nextPosition.source)
    setStatus('watching')
    setError(null)
  }, [])

  const startWatch = useCallback(
    (options, sourceLabel) => {
      if (!navigator.geolocation) return

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (modeRef.current !== 'manual') {
            applyPosition(mapPosition(pos, sourceLabel))
          }
        },
        (err) => {
          if (modeRef.current === 'manual') return

          if (err.code === 1) {
            setError(
              'Location permission denied. Enable GPS in browser settings or tap the map to set your location manually.',
            )
            setStatus('manual')
            modeRef.current = 'manual'
            clearWatch()
            return
          }

          setError(
            'Unable to get your location. Try moving outdoors or tap the map to set your location manually.',
          )
          setStatus('manual')
          modeRef.current = 'manual'
        },
        options,
      )
    },
    [applyPosition, clearWatch],
  )

  useEffect(() => {
    startWatchRef.current = startWatch
  }, [startWatch])

  useEffect(() => {
    if (!geolocationSupported) {
      return undefined
    }

    modeRef.current = 'gps'
    startWatch(HIGH_ACCURACY_OPTIONS, 'gps')

    fallbackTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'gps' && !stabilizedRef.current) {
        setError(
          'Waiting for a GPS reading within 15 meters. Try moving outdoors for a clearer signal.',
        )
      }
    }, 12000)

    return clearWatch
  }, [clearWatch, geolocationSupported, startWatch])

  const setManualPosition = useCallback(
    (coords) => {
      modeRef.current = 'manual'
      clearWatch()
      stabilizedRef.current = coords
      rawAcceptedRef.current = null
      bufferRef.current = []
      kalmanRef.current = null
      setPosition(coords)
      setAccuracy(25)
      setSource('manual')
      setStatus('manual')
      setError(null)
    },
    [clearWatch],
  )

  const resumeGps = useCallback(() => {
    if (!geolocationSupported) return false

    clearWatch()
    modeRef.current = 'gps'
    stabilizedRef.current = null
    rawAcceptedRef.current = null
    bufferRef.current = []
    kalmanRef.current = null
    setSource(null)
    setStatus('pending')
    setError(null)
    startWatch(HIGH_ACCURACY_OPTIONS, 'gps')

    fallbackTimerRef.current = setTimeout(() => {
      if (modeRef.current === 'gps' && !stabilizedRef.current) {
        setError(
          'Waiting for a GPS reading within 15 meters. Try moving outdoors for a clearer signal.',
        )
      }
    }, 12000)

    return true
  }, [clearWatch, geolocationSupported, startWatch])

  const recenterAvailable = !!position

  return {
    position,
    accuracy,
    error,
    status,
    source,
    setManualPosition,
    resumeGps,
    recenterAvailable,
  }
}
