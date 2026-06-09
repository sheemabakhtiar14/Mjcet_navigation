import { ZoomControl } from 'react-leaflet'
import RecenterButton from './RecenterButton'

export default function MapControls({ position, onRecenter }) {
  return (
    <>
      <ZoomControl position="bottomright" />
      <div className="map-controls">
        <RecenterButton position={position} onRecenter={onRecenter} />
      </div>
    </>
  )
}
