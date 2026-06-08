import { haversineDistance } from './geo'

export function parseCampusGeoJson(geoJson) {
  const nodes = new Map()
  const paths = []

  for (const feature of geoJson.features) {
    const { properties, geometry } = feature

    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      nodes.set(properties.id, {
        id: properties.id,
        label: properties.label,
        coords: [lat, lng],
        nodeType: properties.type,
      })
      continue
    }

    if (geometry.type === 'LineString' && properties.type === 'path') {
      paths.push({
        from: properties.from,
        to: properties.to,
        weight: properties.distance_m,
        coordinates: geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      })
    }
  }

  const adjacency = new Map()

  const addEdge = (from, to, weight, coordinates) => {
    if (!adjacency.has(from)) adjacency.set(from, [])
    adjacency.get(from).push({ to, weight, coordinates })
  }

  for (const path of paths) {
    addEdge(path.from, path.to, path.weight, path.coordinates)
    addEdge(path.to, path.from, path.weight, [...path.coordinates].reverse())
  }

  const destinations = Array.from(nodes.values())
    .filter((node) => node.nodeType === 'destination')
    .sort((a, b) => a.label.localeCompare(b.label))

  return { nodes, adjacency, paths, destinations }
}

export function findNearestNodeId(position, nodes) {
  if (!position || nodes.size === 0) return null

  let nearestId = null
  let minDistance = Infinity

  for (const [id, node] of nodes) {
    const distance = haversineDistance(position, node.coords)
    if (distance < minDistance) {
      minDistance = distance
      nearestId = id
    }
  }

  return nearestId
}
