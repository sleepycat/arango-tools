const { Database, aql } = require('arangojs')

const migrateDatabase = async (connection, migration) => {
  // TODO: check migration schema
  try {
    await connection.createDatabase(migration.databaseName, migration.users)
  } catch (e) {
    // if the error is just a duplicate name thats ok. We'll just wrap it
    // up and return it.
    if (e.message !== 'duplicate name') {
      throw new Error(`${migration.databaseName}: ${e.message}`)
    }
  }

  // TODO: need to rework things in a few places to
  // make this work for multiple users
  let [user] = migration.users
  let output = new Database({ url: migration.url })
  output.useDatabase(migration.databaseName)
  await output.login(user.username, user.passwd)

  return {
    query: (strings, ...vars) => output.query(aql(strings, ...vars)),
    drop: () => {
      connection.dropDatabase(migration.databaseName)
    },
    truncate: () => output.truncate(),
  }
}

module.exports.migrateDatabase = migrateDatabase
