import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet'
import { CAMPUS_CENTER, CAMPUS_BOUNDS, DEFAULT_ZOOM } from '../lib/constants'
import MapRecenter from './MapRecenter'

export default function CampusMap({
  position,
  routeCoordinates,
  destination,
  walkwayPaths,
}) {
  return (
    <MapContainer
      center={CAMPUS_CENTER}
      zoom={DEFAULT_ZOOM}
      maxBounds={CAMPUS_BOUNDS}
      maxBoundsViscosity={0.85}
      className="campus-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapRecenter position={position} />

      {walkwayPaths.map((path) => (
        <Polyline
          key={`${path.from}-${path.to}`}
          positions={path.coordinates}
          pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.6 }}
        />
      ))}

      {routeCoordinates?.length > 1 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.9 }}
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
      )}
    </MapContainer>
  )
}
