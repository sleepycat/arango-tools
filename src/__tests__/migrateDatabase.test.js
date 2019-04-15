require('dotenv-safe').config()
const { Database } = require('arangojs')
const { migrateDatabase } = require('../migrateDatabase')
const { dbNameFromFile } = require('../utils')

const { DB_PASSWORD: rootPass } = process.env

describe('migrateDatabase', () => {
  describe('given a migration', () => {
    it('creates a database', async () => {
      let dbname = dbNameFromFile(__filename)
      let connection = new Database()
      connection.useDatabase('_system')
      connection.useBasicAuth('root', rootPass)
      await connection.createDatabase(dbname)

      await migrateDatabase(connection, {
        type: 'database',
        databaseName: dbname,
        users: [{ username: 'mike', passwd: 'mikelovescaro' }],
      })

      let databases = await connection.listDatabases()

      connection.useDatabase('_system')
      await connection.dropDatabase(dbname)

      expect(databases).toContain(dbname)
    })
  })

  it.only('returns an object with query, truncate and drop functions', async () => {
    let dbname = dbNameFromFile(__filename)
    let connection = new Database()
    connection.useDatabase('_system')
    connection.useBasicAuth('root', rootPass)
    await connection.createDatabase(dbname)

    let response = await migrateDatabase(connection, {
      type: 'database',
      databaseName: dbname,
      users: [{ username: 'mike', passwd: 'mikelovescaro' }],
    })

    connection.useDatabase('_system')
		await connection.dropDatabase(dbname)

    expect(response).toEqual(
      expect.objectContaining({
        query: expect.any(Function),
        truncate: expect.any(Function),
        drop: expect.any(Function),
      }),
    )
  })
})
