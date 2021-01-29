const { aql } = require('arangojs')

function databaseAccessors({ connection, rootConnection }) {
  return {
    query: (strings, ...vars) =>
      connection.query(aql(strings, ...vars), { count: true }),
    drop: async () => {
      if (rootConnection) {
        await rootConnection.dropDatabase(connection.name)
      } else {
        throw new Error(
          `Dropping database "${connection.name}" requires root privileges.`,
        )
      }
    },
    truncate: async () => {
      const collections = await connection.collections()
      await Promise.all(collections.map((collection) => collection.truncate()))
      return true
    },
    transaction: (collections) => connection.beginTransaction(collections),
  }
}

module.exports.databaseAccessors = databaseAccessors
