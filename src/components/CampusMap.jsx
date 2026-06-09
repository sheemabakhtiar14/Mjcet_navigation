import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Popup,
} from 'react-leaflet'
import { CAMPUS_CENTER, CAMPUS_BOUNDS, DEFAULT_ZOOM } from '../lib/constants'
import MapInitialCenter from './MapInitialCenter'
import RouteFitBounds from './RouteFitBounds'
import MapClickHandler from './MapClickHandler'
import MapControls from './MapControls'

export default function CampusMap({
  position,
  accuracy,
  routeCoordinates,
  destination,
  walkwayPaths,
  manualMode,
  onManualSelect,
  onRecenter,
}) {
  return (
    <MapContainer
      center={CAMPUS_CENTER}
      zoom={DEFAULT_ZOOM}
      maxBounds={CAMPUS_BOUNDS}
      maxBoundsViscosity={0.85}
      className="campus-map"
      zoomControl={false}
      scrollWheelZoom
      doubleClickZoom
      touchZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapControls position={position} onRecenter={onRecenter} />
      <MapInitialCenter position={position} />
      <RouteFitBounds
        routeCoordinates={routeCoordinates}
        position={position}
        destinationCoords={destination?.coords}
      />
      <MapClickHandler enabled={manualMode} onSelect={onManualSelect} />

      {walkwayPaths.map((path) => (
        <Polyline
          key={`${path.from}-${path.to}`}
          positions={path.coordinates}
          pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.55 }}
        />
      ))}

      {routeCoordinates?.length > 1 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.92 }}
        />
      )}

      {position && accuracy > 0 && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            weight: 1,
            opacity: 0.45,
          }}
        />
      )}

      {position && (
        <CircleMarker
          center={position}
          radius={10}
          pathOptions={{
            color: '#ffffff',
            fillColor: '#2563eb',
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>
      )}

      {destination && (
        <>
          <Circle
            center={destination.coords}
            radius={18}
            pathOptions={{
              color: '#dc2626',
              fillColor: '#ef4444',
              fillOpacity: 0.2,
              weight: 2,
              opacity: 0.85,
            }}
          />
          <CircleMarker
            center={destination.coords}
            radius={10}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#dc2626',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>{destination.label}</Popup>
          </CircleMarker>
        </>
      )}
    </MapContainer>
  )
}
