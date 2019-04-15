const migrateDocumentCollection = async (connection, migration) => {
  try {
    connection.useDatabase(migration.databaseName)
  } catch (e) {
    throw new Error(`${migration.type}: ${e.message}`)
  }

  let existingCollections = await connection.collections()
  let existingCollectionNames = existingCollections.map(c => c.name)
  let results = {}
  let col = connection.collection(migration.name)

  if (!existingCollectionNames.includes(migration.name)) {
    try {
      await col.create(migration.options)
    } catch (e) {
      throw new Error(
        `Creating document collection ${migration.name} failed: ${e.message}`,
      )
    }
  }

  results[migration.name] = {
    save: (doc, opts) => col.save(doc, opts),
    import: (array, opts) => col.import(array, opts),
  }
  return results
}

module.exports.migrateDocumentCollection = migrateDocumentCollection
