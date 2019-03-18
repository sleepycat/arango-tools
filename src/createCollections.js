const createCollections = (db, collections, collectionType = 'document') => {
  if (collectionType === 'edge') {
    return createEdgeCollections(db, collections)
  } else {
    return createDocumentCollections(db, collections)
  }
}
module.exports.createCollections = createCollections

const createEdgeCollections = async (db, collections) => {
  let obj = {}
  for (let c of collections) {
    let col = db.edgeCollection(c)
    try {
      await col.create()
    } catch (e) {
      throw new Error(
        `Creating edge collection ${col} failed blew up: ${e.message}`,
      )
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
  let obj = {}
  for (let c of collections) {
    let col = db.collection(c)
    try {
      await col.create()
    } catch (e) {
      throw new Error(
        `Creating document collection ${col} failed blew up: ${e.message}`,
      )
    }
    obj[c] = {
      save: (doc, opts) => col.save(doc, opts),
      import: (array, opts) => col.import(array, opts),
    }
  }

  return obj
}
module.exports.createDocumentCollections = createDocumentCollections

