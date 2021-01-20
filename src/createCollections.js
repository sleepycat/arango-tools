const createCollections = (db, collections, collectionType = 'document') => {
  if (collectionType === 'edge') {
    return createEdgeCollections(db, collections)
  } else {
    return createDocumentCollections(db, collections)
  }
}
module.exports.createCollections = createCollections

const createEdgeCollections = async (db, collections) => {
  const existingCollections = await db.collections()
  const existingCollectionNames = existingCollections.map((c) => c.name)

  const obj = {}
  for (const c of collections) {
    let col
    if (!existingCollectionNames.includes(c)) {
      try {
        col = await db.createEdgeCollection(c)
      } catch (e) {
        throw new Error(
          `Creating edge collection "${c}" failed blew up: ${e.message}`,
        )
      }
    }
    obj[c] = {
      save: (doc, opts) => col.save(doc, opts),
      import: (array, opts) => col.import(array, opts),
    }
  }

  return obj
}
module.exports.createEdgeCollections = createEdgeCollections

const createDocumentCollections = async (db, collections) => {
  const existingCollections = await db.collections()
  const existingCollectionNames = existingCollections.map((c) => c.name)

  const obj = {}
  for (const c of collections) {
    let col
    if (!existingCollectionNames.includes(c)) {
      try {
        col = await db.createEdgeCollection(c)
      } catch (e) {
        throw new Error(
          `Creating document collection ${c} failed blew up: ${e.message}`,
        )
      }
    }
    obj[c] = {
      save: (doc, opts) => col.save(doc, opts),
      import: (array, opts) => col.import(array, opts),
    }
  }

  return obj
}
module.exports.createDocumentCollections = createDocumentCollections
