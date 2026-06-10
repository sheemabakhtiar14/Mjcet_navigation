import { useEffect, useState } from 'react'

export function useGeolocation() {
  const hasGeolocation = typeof navigator !== 'undefined' && navigator.geolocation
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(
    hasGeolocation ? null : 'Geolocation is not supported on this device.',
  )
  const [status, setStatus] = useState(hasGeolocation ? 'pending' : 'unsupported')

  useEffect(() => {
    if (!hasGeolocation) return undefined

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setStatus('watching')
        setError(null)
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Location permission denied. Enable GPS to see your position.'
            : 'Unable to get your location. Try moving outdoors.',
        )
        setStatus('denied')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [hasGeolocation])

  return { position, error, status }
}
