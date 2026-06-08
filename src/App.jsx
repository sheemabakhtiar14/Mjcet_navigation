import { useCallback, useMemo, useState } from 'react'
import CampusMap from './components/CampusMap'
import DestinationSearch from './components/DestinationSearch'
import VoiceButton from './components/VoiceButton'
import { useCampusData } from './hooks/useCampusData'
import { useGeolocation } from './hooks/useGeolocation'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { createDestinationMatcher } from './lib/destinations'
import { findNearestNodeId } from './lib/graph'
import { findShortestPath } from './lib/pathfinding'
import { announceNotFound, confirmNavigation } from './lib/speech'
import './App.css'

function App() {
  const { data: campusData, loading, error: campusError } = useCampusData()
  const { position, error: locationError, status: locationStatus } =
    useGeolocation()
  const [destination, setDestination] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState(null)
  const [navMessage, setNavMessage] = useState('')

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
        setNavMessage('Waiting for your location before routing.')
        return
      }

      const startId = findNearestNodeId(position, campusData.nodes)
      const endId = selectedDestination.id
      const path = findShortestPath(
        startId,
        endId,
        campusData.nodes,
        campusData.adjacency,
      )

      if (!path) {
        setNavMessage('No walking route found to that destination.')
        if (speak) announceNotFound()
        return
      }

      setDestination(selectedDestination)
      setRouteCoordinates(path.routeCoordinates)
      setNavMessage(`Route to ${selectedDestination.label}`)
      if (speak) confirmNavigation(selectedDestination.label)
    },
    [campusData, position],
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

      {(locationError || navMessage) && (
        <p className="status-banner" role="status">
          {locationError || navMessage}
        </p>
      )}

      {locationStatus === 'pending' && !locationError && (
        <p className="status-banner" role="status">
          Getting your location...
        </p>
      )}

      <CampusMap
        position={position}
        routeCoordinates={routeCoordinates}
        destination={destination}
        walkwayPaths={campusData.paths}
      />
    </div>
  )
}

export default App
