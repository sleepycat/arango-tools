const migrateEdgeCollection = async (connection, migration) => {
  try {
    connection.useDatabase(migration.databaseName)
  } catch (e) {
    throw new Error(`${migration.type}: ${e.message}`)
  }

  const existingCollections = await connection.collections()
  const existingCollectionNames = existingCollections.map(c => c.name)
  const results = {}
  const col = connection.edgeCollection(migration.name)

  if (!existingCollectionNames.includes(migration.name)) {
    try {
      await col.create(migration.options)
    } catch (e) {
      throw new Error(
        `Creating edge collection ${migration.name} failed: ${e.message}`,
      )
    }
  }

  results[migration.name] = {
    save: (doc, opts) => col.save(doc, opts),
    import: (array, opts) => col.import(array, opts),
  }
  return results
}

module.exports.migrateEdgeCollection = migrateEdgeCollection
