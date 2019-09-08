require('dotenv-safe').config()
const { Database } = require('arangojs')
const { migrateDatabase } = require('../migrateDatabase')
const { dbNameFromFile } = require('../utils')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

describe('migrateDatabase', () => {
  describe('given a migration', () => {
    it('creates a database for a non-root user', async () => {
      const dbname = dbNameFromFile(__filename)
      const connection = new Database({ url })
      await connection.login('root', rootPass)
      connection.useDatabase('_system')

      await migrateDatabase(connection, {
        type: 'database',
        url,
        databaseName: dbname,
        users: [{ username: 'mike', passwd: 'secret' }],
      })

      const userConnection = new Database({ url })
      userConnection.useDatabase(dbname)
      await userConnection.login('mike', 'secret')

      const databases = await userConnection.listUserDatabases()

      expect(databases).toContain(dbname)
      await connection.dropDatabase(dbname)
    })

    it('creates a database for a root user', async () => {
      const dbname = dbNameFromFile(__filename)
      const connection = new Database({ url })
      await connection.login('root', rootPass)
      connection.useDatabase('_system')

      await migrateDatabase(connection, {
        type: 'database',
        url,
        databaseName: dbname,
        users: [{ username: 'root', passwd: rootPass }],
      })

      const userConnection = new Database({ url })
      userConnection.useDatabase(dbname)
      await userConnection.login('root', rootPass)

      const databases = await userConnection.listUserDatabases()

      expect(databases).toContain(dbname)

      await connection.dropDatabase(dbname)
    })
  })

  it('returns an object with query, truncate and drop functions', async () => {
    const dbname = 'a' + dbNameFromFile(__filename)
    const connection = new Database({ url })
    connection.useDatabase('_system')
    connection.useBasicAuth('root', rootPass)

    const response = await migrateDatabase(connection, {
      type: 'database',
      url,
      databaseName: dbname,
      users: [{ username: 'mike', passwd: 'secret' }],
    })

    expect(response).toEqual(
      expect.objectContaining({
        query: expect.any(Function),
        truncate: expect.any(Function),
        drop: expect.any(Function),
      }),
    )

    connection.useDatabase('_system')
    await connection.dropDatabase(dbname)
  })
})
