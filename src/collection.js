const collection = async ({ connection, name, type = 'document', options }) => {
  let c = connection.collection(name)
  let existing
  try {
    existing = await c.exists()
  } catch (e) {
    if (e.message.match(/not authorized/i)) {
      return {
        collection: false,
        message: `Permission denied connecting to "${connection.name}". Check user has 'rw' not 'none'.`,
      }
    }
  }

  if (!existing) {
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
  }
  return { collection: c, message: false }
}

module.exports.collection = collection
