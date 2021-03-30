const createCollection = async ({
  connection,
  name,
  type = 'document',
  options,
}) => {
  let c = connection.collection(name)

  try {
    if (type === 'edge') {
      c = await connection.createEdgeCollection(name, options)
    } else {
      c = await connection.createCollection(name, options)
    }
  } catch (e) {
    if (e.message.match(/cannot create collection/i)) {
      return {
        collection: false,
        message: `Missing permission to create collection "${name}". Check user has 'rw' not 'ro'.`,
      }
    }
  }
  return { collection: c, message: false }
}

async function clustered(db) {
  if (!db.isArangoDatabase)
    throw new Error('clustered function requires an ArangoDatabase instance')
  try {
    await db.acquireHostList()
    return true
  } catch {
    return false
  }
}

async function updateMutableProperties({
  connection,
  options,
  collection,
  name,
}) {
  const description = await collection.properties()
  const isCluster = await clustered(connection)

  const opts = {}
  if (description.waitForSync !== options.waitForSync) {
    opts.waitForSync = options.waitForSync
  }
  if (
    isCluster ??
    description.replicationFactor ??
    description.replicationFactor !== options.replicationFactor
  ) {
    // TODO: should this test for NODE_ENV !== production?
    opts.replicationFactor = options.replicationFactor
  }
  if (description.schema !== options.schema) {
    opts.schema = options.schema
  }
  // minReplicationFactor is now called writeConcern
  if (
    description.writeConcern &&
    options.writeConcern &&
    description.writeConcern !== options.writeConcern
  ) {
    opts.writeConcern = options.writeConcern
  }

  try {
    await connection
      .route(`/_api/collection/${encodeURI(name)}/properties`)
      .put(opts)
  } catch (e) {
    if (e.message.match(/bad value for writeConcern/i)) {
      return {
        collection: false,
        message: `Tried to update writeConcern to ${options.writeConcern}, which cannot be higher than replicationFactor of ${description.replicationFactor}.`,
      }
    } else {
      return {
        collection: false,
        message: `Error updating collection properties: ${e.message}`,
      }
    }
  }
  const updated = connection.collection(name)
  return { collection: updated, message: false }
}

async function collection({ connection, name, type = 'document', options }) {
  const collection = connection.collection(name)
  let exists
  try {
    exists = await collection.exists()
  } catch (e) {
    if (e.message.match(/not authorized/i)) {
      return {
        collection: false,
        message: `Permission denied connecting to "${connection.name}". Check user has 'rw' not 'none'.`,
      }
    }
  }

  if (exists) {
    // correct?
    return updateMutableProperties({
      connection,
      options,
      name,
      collection,
    })
  } else {
    // create it and return it!
    return await createCollection({ connection, name, type, options })
  }
}

module.exports.collection = collection
