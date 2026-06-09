import { useCallback, useMemo, useState } from 'react'
import CampusMap from './components/CampusMap'
import DestinationSearch from './components/DestinationSearch'
import VoiceButton from './components/VoiceButton'
import RouteInfo from './components/RouteInfo'
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
  } = useGeolocation()

  const [destination, setDestination] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState(null)
  const [routeSummary, setRouteSummary] = useState('')
  const [directions, setDirections] = useState([])
  const [navMessage, setNavMessage] = useState('')

  const manualMode =
    locationStatus === 'manual' ||
    locationStatus === 'denied' ||
    !!locationError

  const matchDestination = useMemo(
    () =>
      campusData
        ? createDestinationMatcher(campusData.destinations)
        : () => null,
    [campusData],
  )

  const navigateTo = useCallback(
    (selectedDestination, { speak = false } = {}) => {
      if (!campusData) return

      if (!position) {
        setNavMessage(
          manualMode
            ? 'Tap the map to set your location, then choose a destination.'
            : 'Waiting for your location before routing.',
        )
        return
      }

      const result = computeRoute(position, selectedDestination, campusData)

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
    [campusData, position, manualMode],
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
      setNavMessage('Manual location set. Select a destination to navigate.')
    },
    [setManualPosition],
  )

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
    locationStatus === 'pending'
      ? 'Getting your location...'
      : locationStatus === 'fallback'
        ? 'Using network location. For better accuracy, move outdoors.'
        : manualMode
          ? 'Tap the map to set your location.'
          : locationSource === 'manual'
            ? 'Using manually selected location.'
            : ''

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

      {routeSummary && (
        <RouteInfo
          summary={routeSummary}
          directions={directions}
          destinationLabel={destination?.label}
        />
      )}

      {(locationError || navMessage) && (
        <p className="status-banner" role="status">
          {locationError || navMessage}
        </p>
      )}

      {!locationError && locationHint && !navMessage && (
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
        manualMode={manualMode || locationSource === 'manual'}
        onManualSelect={handleManualSelect}
      />
    </div>
  )
}

export default App
