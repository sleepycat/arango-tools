const { Database, aql } = require('arangojs')

const migrateDatabase = async (connection, migration) => {
  // TODO: check migration schema
  try {
    await connection.createDatabase(migration.databaseName, {
      users: migration.users,
    })
  } catch (e) {
    // if the error is just a duplicate name thats ok. We'll just wrap it
    // up and return it.
    if (!e.message.match(/duplicate/)) {
      throw new Error(`${migration.databaseName}: ${e.message}`)
    }
  }

  // TODO: need to rework things in a few places to
  // make this work for multiple users
  const [user] = migration.users
  const output = new Database({
    url: migration.url,
    databaseName: migration.databaseName,
  })
  await output.login(user.username, user.passwd)

  return {
    query: async function query(strings, ...vars) {
      const cursor = await output.query(aql(strings, ...vars), { count: true })
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
      return connection.dropDatabase(migration.databaseName)
    },
    truncate: async () => {
      const collections = await output.collections()
      for (const collection of collections) {
        await collection.truncate()
      }
      return true
    },
    transaction: async function transaction(collections) {
      const cursor = await output.beginTransaction(collections)
      return new Proxy(cursor, {
        get(target, name, receiver) {
          // arangojs renamed run to step
          if (name === 'run') {
            return Reflect.get(target, 'step', receiver)
            //
          }
          return Reflect.get(target, name, receiver)
        },
      })
    },
  }
}

module.exports.migrateDatabase = migrateDatabase
