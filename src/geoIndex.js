async function geoIndex({ connection, on, fields, geoJson = false }) {
  const collection = connection.collection(on)
  const exists = await collection.exists()

  if (!exists) {
    throw new Error(`Can't add a geoindex to a collection that doesn't exist`)
  }

  let index
  try {
    index = await collection.ensureIndex({
      fields,
      type: 'geo',
      geoJson,
    })
  } catch (e) {
    throw new Error(`Failed to create geo index ${e.message}`)
  }
  return index
}

module.exports.geoIndex = geoIndex
