import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export default function MapClickHandler({ enabled, onSelect }) {
  const map = useMap()

  useEffect(() => {
    if (!enabled) return undefined

    const handleClick = (event) => {
      onSelect([event.latlng.lat, event.latlng.lng])
    }

    map.on('click', handleClick)
    return () => map.off('click', handleClick)
  }, [enabled, map, onSelect])

  return null
}
