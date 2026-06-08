import { useEffect, useState } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.')
      setStatus('unsupported')
      return undefined
    }

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
  }, [])

  return { position, error, status }
}
