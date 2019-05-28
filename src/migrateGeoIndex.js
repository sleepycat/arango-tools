const migrateGeoIndex = async (connection, migration) => {
  try {
    connection.useDatabase(migration.databaseName)
  } catch (e) {
    throw new Error(`${migration.type}: ${e.message}.`)
  }

  let collection = connection.collection(migration.collection)
  const exists = await collection.exists()

  if (!exists) {
    throw new Error(`Can't add a geoindex to a collection that doesn't exist`)
  }

  let index
  try {
    if (migration.geojson) {
      index = await collection.createGeoIndex(migration.fields, {
        geoJson: true,
      })
    } else index = await collection.createGeoIndex(migration.fields)
  } catch (e) {
    throw new Error(`${migration.type}: ${e.message}`)
  }
  return index
}

module.exports.migrateGeoIndex = migrateGeoIndex
