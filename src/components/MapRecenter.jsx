import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

export default function MapRecenter({ position }) {
  const map = useMap()
  const hasCentered = useRef(false)

  useEffect(() => {
    if (!position || hasCentered.current) return

    map.flyTo(position, map.getZoom(), { duration: 0.8 })
    hasCentered.current = true
  }, [map, position])

  return null
}
