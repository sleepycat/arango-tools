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
    query: (strings, ...vars) =>
      output.query(aql(strings, ...vars), { count: true }),
    drop: () => {
      connection.dropDatabase(migration.databaseName)
    },
    truncate: async () => {
      const collections = await output.collections()
      for (const collection of collections) {
        await collection.truncate()
      }
      return true
    },
    transaction: (collections) => output.beginTransaction(collections),
  }
}

module.exports.migrateDatabase = migrateDatabase
