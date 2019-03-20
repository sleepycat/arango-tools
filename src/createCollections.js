const createCollections = (db, collections, collectionType = 'document') => {
  if (collectionType === 'edge') {
    return createEdgeCollections(db, collections)
  } else {
    return createDocumentCollections(db, collections)
  }
}
module.exports.createCollections = createCollections

const createEdgeCollections = async (db, collections) => {
  let existingCollections = await db.collections()
  let existingCollectionNames = existingCollections.map(c => c.name)
  let obj = {}
  for (let c of collections) {
    let col = db.edgeCollection(c)
    if (!existingCollectionNames.includes(c)) {
      try {
        await col.create()
      } catch (e) {
        throw new Error(
          `Creating edge collection ${c} failed blew up: ${e.message}`,
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
  let existingCollections = await db.collections()
  let existingCollectionNames = existingCollections.map(c => c.name)

  let obj = {}
  for (let c of collections) {
    let col = db.collection(c)
    if (!existingCollectionNames.includes(c)) {
      try {
        await col.create()
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
