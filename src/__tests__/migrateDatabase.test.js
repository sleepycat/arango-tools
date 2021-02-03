require('dotenv-safe').config()
const { Database } = require('arangojs')
const { migrateDatabase } = require('../migrateDatabase')
const { dbNameFromFile } = require('../utils')
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

describe('migrateDatabase()', () => {
  describe('given an existing database', () => {
    describe('when creating a database for the root user', () => {
      it('is possible to log into the created database', async () => {
        // run a migration for a database of the same name
        const name = 'login_possible_' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPass)

        await migrateDatabase(sys, {
          type: 'database',
          url,
          databaseName: name,
          users: [{ username: name, passwd: 'test' }],
        })

        try {
          const newdb = new Database({ url, databaseName: name })
          await newdb.login(name, 'test')

          await expect(newdb.exists()).resolves.toEqual(true)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('returns a working truncate function', async () => {
        // run a migration for a database of the same name
        const name = 'truncate_works_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPass)

        const migration = {
          type: 'database',
          url,
          databaseName: name,
          users: [{ username: name, passwd: 'test' }],
        }

        await sys.createDatabase(name, migration.users)

        const db = new Database({ url, databaseName: name })
        await db.login(name, 'test')
        const collection = await db.createCollection('foos')
        await collection.save({ foo: 'bar' })

        const { query, truncate } = await migrateDatabase(sys, migration)

        try {
          const before = await query`FOR foo IN foos RETURN foo`
          expect(before.count).toEqual(1)

          await truncate()

          const after = await query`FOR foo IN foos RETURN foo`
          expect(after.count).toEqual(0)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('returns functions to operate on the existing database as the root user', async () => {
        // run a migration for a database of the same name
        const name = 'existing_db_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPass)

        const migration = {
          type: 'database',
          url,
          databaseName: name,
          users: [{ username: name, passwd: 'test' }],
        }

        await sys.createDatabase(name, migration.users)

        try {
          await expect(migrateDatabase(sys, migration)).resolves.toEqual(
            expect.objectContaining({
              query: expect.any(Function),
              drop: expect.any(Function),
              truncate: expect.any(Function),
            }),
          )
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('given no databases exist', () => {
    describe('when creating a database for a root user', () => {
      it('creates a database', async () => {
        const name = 'nodb_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPass)

        try {
          await migrateDatabase(sys, {
            type: 'database',
            url,
            databaseName: name,
            users: [{ username: 'root', passwd: rootPass }],
          })

          await expect(sys.listUserDatabases()).resolves.toContain(name)
        } finally {
          await sys.dropDatabase(name)
        }
      })
    })

    describe('when creating a database for a non-root user', () => {
      it('creates a database and gives the user permissions on it', async () => {
        const name = 'nonroot_' + dbNameFromFile(__filename)

        const sys = new Database({ url })
        await sys.login('root', rootPass)

        try {
          await migrateDatabase(sys, {
            type: 'database',
            url,
            databaseName: name,
            users: [{ username: name, passwd: 'secret' }],
          })

          const userConnection = new Database({ url, databaseName: name })
          await userConnection.login(name, 'secret')

          const databases = await userConnection.listUserDatabases()

          expect(databases).toContain(name)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('returns functions to operate on the existing database as the given user', async () => {
        const name = 'transaction_' + dbNameFromFile(__filename)

        const sys = new Database({ url })
        await sys.login('root', rootPass)

        try {
          const response = await migrateDatabase(sys, {
            type: 'database',
            url,
            databaseName: name,
            users: [{ username: name, passwd: 'secret' }],
          })

          expect(response).toEqual(
            expect.objectContaining({
              query: expect.any(Function),
              truncate: expect.any(Function),
              drop: expect.any(Function),
              transaction: expect.any(Function),
            }),
          )
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('returns a transaction function that returns a transaction object', async () => {
        const name = 'transaction_test' + dbNameFromFile(__filename)

        const sys = new Database({ url })
        await sys.login('root', rootPass)

        try {
          const response = await migrateDatabase(sys, {
            type: 'database',
            url,
            databaseName: name,
            users: [{ username: name, passwd: 'secret' }],
          })

          const connection = new Database({ url, databaseName: name })
          await connection.login(name, 'secret')
          const collection = connection.collection('potatoes')
          await collection.create()

          expect(
            response.transaction({ read: ['potatoes'] }),
          ).resolves.toMatchObject(
            expect.objectContaining({
              id: expect.any(String),
              isArangoTransaction: true,
            }),
          )
        } finally {
          await deleteUser(sys, name)
          await sys.dropDatabase(name)
        }
      })

      it('returns a query function that has the count option enabled', async () => {
        const name = 'query_count_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPass)

        const connection = new Database({ url })
        connection.useDatabase('_system')
        connection.useBasicAuth('root', rootPass)

        try {
          const response = await migrateDatabase(connection, {
            type: 'database',
            url,
            databaseName: name,
            users: [{ username: name, passwd: 'secret' }],
          })

          const cursor = await response.query`FOR i IN [1,2,3] RETURN i`

          expect(cursor).toMatchObject({ count: 3 })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })
})
