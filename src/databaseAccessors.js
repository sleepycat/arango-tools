const { aql } = require('arangojs')

function databaseAccessors({ connection, rootConnection }) {
  return {
    query: async function query(strings, ...vars) {
      const cursor = await connection.query(aql(strings, ...vars), {
        count: true,
      })
      return new Proxy(cursor, {
        get(target, name, receiver) {
          // arangojs renamed each to forEach
          if (name === 'each') {
            return Reflect.get(target, 'forEach', receiver)
          }
          return Reflect.get(target, name, receiver)
        },
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
      const cursor = await connection.beginTransaction(collections)
      return new Proxy(cursor, {
        get(target, name, receiver) {
          // arangojs renamed run to step
          if (name === 'run') {
            return Reflect.get(target, 'step', receiver)
          }
          return Reflect.get(target, name, receiver)
        },
      })
    },
  }
}

module.exports.databaseAccessors = databaseAccessors
