const migrateGeoIndex = async (connection, migration) => {
  try {
    connection.useDatabase(migration.databaseName)
  } catch (e) {
    throw new Error(`${migration.type}: ${e.message}.`)
  }

  const collection = connection.collection(migration.collection)
  const exists = await collection.exists()

  if (!exists) {
    throw new Error(`Can't add a geoindex to a collection that doesn't exist`)
  }

  let index
  try {
    index = await collection.ensureIndex({
      ...migration.options,
      type: 'geo',
    })
  } catch (e) {
    throw new Error(`${migration.type}: ${e.message}`)
  }
  return index
}

module.exports.migrateGeoIndex = migrateGeoIndex
