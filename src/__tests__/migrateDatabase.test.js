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
      let databaseName, connection

      beforeEach(async () => {
        // eslint-disable-next-line
        databaseName = dbNameFromFile('existing' + __filename)
        // create a connection
        connection = new Database({ url })
        await connection.login('root', rootPass)
        connection.useDatabase('_system')

        // make an existing database
        await connection.createDatabase(databaseName)
      })

      afterEach(async () => {
        await connection.dropDatabase(databaseName)
      })

      it('returns functions to operate on the existing database as the root user', async () => {
        // run a migration for a database of the same name
        await expect(
          migrateDatabase(connection, {
            type: 'database',
            url,
            databaseName,
            users: [{ username: 'root', passwd: rootPass }],
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            query: expect.any(Function),
            drop: expect.any(Function),
            truncate: expect.any(Function),
          }),
        )
      })
    })
  })

  describe('given no databases exist', () => {
    describe('when creating a database for a root user', () => {
      let databaseName, connection

      const connect = async ({
        to: name,
        with: { u = 'root', p = rootPass },
      }) => {
        const conn = new Database({ url, databaseName: name })
        conn.useDatabase(name)
        await conn.login(u, p)
        return conn
      }

      beforeEach(async () => {
        databaseName = dbNameFromFile(__filename)
        connection = new Database({ url })
        await connection.login('root', rootPass)
        connection.useDatabase('_system')
      })

      afterEach(async () => {
        await connection.dropDatabase(databaseName)
      })

      it('creates a database that is accessible to the root user', async () => {
        await migrateDatabase(connection, {
          type: 'database',
          url,
          databaseName,
          users: [{ username: 'root', passwd: rootPass }],
        })

        const rootConnection = await connect({
          with: { u: 'root', p: rootPass },
          to: databaseName,
        })

        await expect(rootConnection.listUserDatabases()).resolves.toContain(
          databaseName,
        )
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
