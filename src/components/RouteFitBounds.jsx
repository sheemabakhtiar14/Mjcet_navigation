import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

export default function RouteFitBounds({ routeCoordinates, position, destinationCoords }) {
  const map = useMap()

  useEffect(() => {
    if (!routeCoordinates?.length) return

    const points = [...routeCoordinates]
    if (position) points.push(position)
    if (destinationCoords) points.push(destinationCoords)

    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 19 })
  }, [map, routeCoordinates, position, destinationCoords])

  return null
}
