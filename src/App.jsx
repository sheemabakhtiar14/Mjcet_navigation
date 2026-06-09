import { useCallback, useMemo, useState } from 'react'
import CampusMap from './components/CampusMap'
import DestinationSearch from './components/DestinationSearch'
import VoiceButton from './components/VoiceButton'
import RouteInfo from './components/RouteInfo'
import LocationModeToggle from './components/LocationModeToggle'
import { useCampusData } from './hooks/useCampusData'
import { useGeolocation } from './hooks/useGeolocation'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { createDestinationMatcher } from './lib/destinations'
import { computeRoute, formatRouteSummary } from './lib/routing'
import { announceNotFound, confirmNavigation } from './lib/speech'
import './App.css'

function App() {
  const { data: campusData, loading, error: campusError } = useCampusData()
  const {
    position,
    accuracy,
    error: locationError,
    status: locationStatus,
    source: locationSource,
    setManualPosition,
    resumeGps,
  } = useGeolocation()

  const [destination, setDestination] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState(null)
  const [routeSummary, setRouteSummary] = useState('')
  const [directions, setDirections] = useState([])
  const [navMessage, setNavMessage] = useState('')
  const [manualPickActive, setManualPickActive] = useState(false)

  const gpsUnavailable =
    locationStatus === 'manual' ||
    locationStatus === 'denied' ||
    !!locationError
  const usingManualLocation = locationSource === 'manual'
  const gpsAvailable = typeof navigator !== 'undefined' && !!navigator.geolocation
  const pickLocationEnabled = gpsUnavailable || manualPickActive

  const matchDestination = useMemo(
    () =>
      campusData
        ? createDestinationMatcher(campusData.destinations)
        : () => null,
    [campusData],
  )

  const navigateTo = useCallback(
    (selectedDestination, { speak = false, fromCoords = position } = {}) => {
      if (!campusData) return

      if (!fromCoords) {
        setNavMessage(
          pickLocationEnabled
            ? 'Tap the map to set your location, then choose a destination.'
            : 'Waiting for your location before routing.',
        )
        return
      }

      const result = computeRoute(fromCoords, selectedDestination, campusData)

      if (!result.ok) {
        setRouteCoordinates(null)
        setRouteSummary('')
        setDirections([])
        setNavMessage(result.error)
        if (speak) announceNotFound()
        return
      }

      setDestination(selectedDestination)
      setRouteCoordinates(result.routeCoordinates)
      setRouteSummary(
        formatRouteSummary(result.distanceM, result.durationMin),
      )
      setDirections(result.directions)
      setNavMessage(`Route to ${selectedDestination.label}`)
      if (speak) confirmNavigation(selectedDestination.label)
    },
    [campusData, position, pickLocationEnabled],
  )

  const handleDestinationSelect = useCallback(
    (selected) => {
      navigateTo(selected)
    },
    [navigateTo],
  )

  const handleVoiceResult = useCallback(
    (transcript) => {
      const matched = matchDestination(transcript)
      if (!matched) {
        setNavMessage('Destination not found.')
        announceNotFound()
        return
      }

      navigateTo(matched, { speak: true })
    },
    [matchDestination, navigateTo],
  )

  const handleManualSelect = useCallback(
    (coords) => {
      setManualPosition(coords)
      setManualPickActive(false)

      if (destination) {
        navigateTo(destination, { fromCoords: coords })
        setNavMessage(`Location updated. Route to ${destination.label}`)
      } else {
        setNavMessage('Location set. Select a destination to navigate.')
      }
    },
    [setManualPosition, destination, navigateTo],
  )

  const handleOutOfBounds = useCallback(() => {
    setNavMessage('Tap inside the campus area to set your location.')
  }, [])

  const handleStartManualPick = useCallback(() => {
    setManualPickActive(true)
    setNavMessage('Tap the map to set your location.')
  }, [])

  const handleCancelManualPick = useCallback(() => {
    setManualPickActive(false)
    setNavMessage('')
  }, [])

  const handleResumeGps = useCallback(() => {
    if (resumeGps()) {
      setManualPickActive(false)
      setNavMessage('Resuming GPS location...')
    }
  }, [resumeGps])

  const { listening, supported, startListening } =
    useSpeechRecognition(handleVoiceResult)

  if (loading) {
    return (
      <div className="app app-loading">
        <p className="status-banner" role="status">
          Loading campus map...
        </p>
      </div>
    )
  }

  if (campusError || !campusData) {
    return (
      <div className="app app-loading">
        <p className="status-banner" role="status">
          {campusError ?? 'Campus map unavailable.'}
        </p>
      </div>
    )
  }

  const locationHint =
    manualPickActive
      ? 'Tap anywhere on the campus map to set your location.'
      : locationStatus === 'pending'
        ? 'Getting your location...'
        : locationStatus === 'fallback'
          ? 'Using network location. For better accuracy, move outdoors.'
          : gpsUnavailable
            ? 'Tap the map to set your location.'
            : usingManualLocation
              ? 'Using manually selected location.'
              : ''

  const showStatusBanner = locationError || navMessage
  const showLocationHint = !locationError && locationHint && !navMessage

  return (
    <div className="app">
      <header className="app-header">
        <h1>MJCET Campus Navigation</h1>
      </header>

      <div className="controls">
        <DestinationSearch
          destinations={campusData.destinations}
          value={destination}
          onChange={handleDestinationSelect}
        />
        <VoiceButton
          listening={listening}
          supported={supported}
          onClick={startListening}
        />
      </div>

      <LocationModeToggle
        manualPickActive={manualPickActive}
        usingManualLocation={usingManualLocation}
        gpsAvailable={gpsAvailable}
        onStartManualPick={handleStartManualPick}
        onCancelManualPick={handleCancelManualPick}
        onResumeGps={handleResumeGps}
      />

      {routeSummary && (
        <RouteInfo
          summary={routeSummary}
          directions={directions}
          destinationLabel={destination?.label}
        />
      )}

      {showStatusBanner && (
        <p className="status-banner" role="status">
          {locationError || navMessage}
        </p>
      )}

      {showLocationHint && (
        <p className="status-banner status-banner-muted" role="status">
          {locationHint}
        </p>
      )}

      <CampusMap
        position={position}
        accuracy={accuracy}
        routeCoordinates={routeCoordinates}
        destination={destination}
        walkwayPaths={campusData.paths}
        manualMode={pickLocationEnabled}
        onManualSelect={handleManualSelect}
        onOutOfBounds={handleOutOfBounds}
      />
    </div>
  )
}

export default App
