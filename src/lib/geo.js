const EARTH_RADIUS_M = 6371000

export function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

export function haversineDistance([lat1, lng1], [lat2, lng2]) {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

export function coordKey([lat, lng]) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

export function findNearestNode(position, nodes) {
  if (!position || nodes.length === 0) return null

  let nearest = nodes[0]
  let minDistance = haversineDistance(position, nearest.coords)

  for (let i = 1; i < nodes.length; i += 1) {
    const distance = haversineDistance(position, nodes[i].coords)
    if (distance < minDistance) {
      minDistance = distance
      nearest = nodes[i]
    }
  }

  return nearest
}
