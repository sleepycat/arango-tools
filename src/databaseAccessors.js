const { aql } = require('arangojs')

function databaseAccessors({ connection, rootConnection }) {
  return {
    query: async function query(strings, ...vars) {
      return connection.query(aql(strings, ...vars), {
        count: true,
      })
    },
    drop: () => {
      if (rootConnection) {
        return rootConnection.dropDatabase(connection.name)
      } else {
        throw new Error(
          `Dropping database "${connection.name}" requires root privileges.`,
        )
      }
    },
    truncate: async () => {
      const collections = await connection.collections()
      for (const collection of collections) {
        await collection.truncate()
      }
      return true
    },
    transaction: async function transaction(collections) {
      return connection.beginTransaction(collections)
    },
  }
}

module.exports.databaseAccessors = databaseAccessors
