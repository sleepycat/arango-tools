const { Database } = require('arangojs')
const { dbNameFromFile } = require('../utils')
const { grantAccess } = require('../grantAccess')
const { createUser } = require('../createUser')
const { deleteUser } = require('../deleteUser')
const { collection } = require('../collection')
const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

describe('collection', () => {
  let sys

  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    await sys.login('root', rootPass)
  })

  describe('as a user', () => {
    describe('with an existing collection', () => {
      it('returns a collection and message', async () => {
        const name = 'returns_existing_collection_' + dbNameFromFile(__filename)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')

        // existing collection
        await connection.createCollection('places')

        try {
          // try to verify with ensure
          const response = await collection({
            connection,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          })

          expect(response.collection.isArangoCollection).toEqual(true)
          expect(response.collection.name).toEqual('places')
          expect(response.message).toEqual(false)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })

    describe('when no collection exists', () => {
      it('succeeds in adding a collection to the specified database', async () => {
        const name = 'adds_collection_' + dbNameFromFile(__filename)
        // make the database and add
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        // connect as
        const connection = new Database({ url })
        connection.useDatabase(name)
        await connection.login(name, 'test')

        try {
          // try to verify with ensure
          await collection({
            connection,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          })

          const collections = await connection.collections()
          expect(collections.length).toBe(1)
          expect(collections[0].name).toEqual('places')
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('returns an edge collection when told', async () => {
        const name = 'returns_edge_collection_' + dbNameFromFile(__filename)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        // connect as
        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')

        try {
          // try to verify with ensure
          const { collection: col } = await collection({
            connection,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
            type: 'edge',
          })

          const properties = await col.properties()
          expect(properties.type).toEqual(3)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('returns a collection and a message', async () => {
        const name = 'returns_document_collection_' + dbNameFromFile(__filename)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')

        try {
          // try to verify with ensure
          const { collection: col, message } = await collection({
            connection,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          })

          expect(col.isArangoCollection).toEqual(true)
          expect(message).toEqual(false)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('handles none permissions error', async () => {
        const name = 'permissions_none_' + dbNameFromFile(__filename)
        // make the database
        await sys.createDatabase(name)
        await createUser(sys, { user: name, passwd: 'test' })
        await grantAccess(sys, name, name, 'none')

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')

        try {
          // try to verify with ensure
          const response = await collection({
            connection,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          })

          expect(response.message).toMatch(/Permission denied connecting/)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })

      it('handles read only permissions error', async () => {
        const name = 'ro_permissions_' + dbNameFromFile(__filename)
        // make the database
        await sys.createDatabase(name)
        await createUser(sys, { user: name, passwd: 'test' })
        await grantAccess(sys, name, name, 'ro')

        const connection = new Database()
        connection.useDatabase(name)
        await connection.login(name, 'test')

        try {
          // try to verify with ensure
          const response = await collection({
            connection,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          })

          expect(response).toEqual({
            collection: false,
            message:
              "Missing permission to create collection \"places\". Check user has 'rw' not 'ro'.",
          })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })
})
