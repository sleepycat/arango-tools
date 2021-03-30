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
      it('updates the schema', async () => {
        const name = 'user_writeConcern_too_high_' + dbNameFromFile(__filename)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        // https://www.arangodb.com/docs/3.8/data-modeling-documents-schema-validation.html
        const schema = {
          rule: {
            properties: {
              nums: { type: 'array', items: { type: 'number', maximum: 6 } },
            },
            additionalProperties: { type: 'string' },
            required: ['nums'],
          },
          level: 'moderate',
          message:
            "The document does not contain an array of numbers in attribute 'nums', or one of the numbers is bigger than 6.",
        }

        const userconnection = new Database({ url, databaseName: name })
        await userconnection.login(name, 'test')

        // existing collection
        await userconnection.createCollection('places', {
          schema: null,
        })

        try {
          await collection({
            connection: userconnection,
            name: 'places',
            options: { schema },
          })

          const places = await userconnection.collection('places')
          const properties = await places.properties()

          expect(properties.schema).toEqual(schema)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    xdescribe('with an existing collection', () => {
      it('gives a useful error when writeConcern is higher than replicationFactor', async () => {
        const name = 'user_writeConcern_too_high_' + dbNameFromFile(__filename)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        const userconnection = new Database({ url, databaseName: name })
        await userconnection.login(name, 'test')

        // existing collection
        await userconnection.createCollection('places', {
          // writeConcern can't be higher than replicationFactor
          replicationFactor: 1, // default
          writeConcern: 1,
        })

        try {
          // update writeConcern
          const { message } = await collection({
            connection: userconnection,
            name: 'places',
            // update writeConcern to match replicationFactor
            options: { writeConcern: 2 },
          })

          expect(message).toEqual(
            'Tried to update writeConcern to 2, which cannot be higher than replicationFactor of 1.',
          )
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing collection', () => {
      it('updates writeConcern', async () => {
        const name = 'user_update_writeConcern_' + dbNameFromFile(__filename)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        const userconnection = new Database({ url, databaseName: name })
        await userconnection.login(name, 'test')

        // existing collection
        await userconnection.createCollection('places')

        try {
          // update writeConcern
          await collection({
            connection: userconnection,
            name: 'places',
            // update writeConcern to match replicationFactor
            options: { writeConcern: 1 },
          })

          const places = await userconnection.collection('places')
          const properties = await places.properties()
          expect(properties.writeConcern).toEqual(1)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing collection', () => {
      it('updates replicationFactor if it exists', async () => {
        // This gross test exists because replicationFactor is only available on clusters
        // The idea here is that we don't want to crash and burn on single
        // mode, if that one property can't be supported.
        const name =
          'user_update_replicationFactor_' + dbNameFromFile(__filename)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        const user = new Database({ url, databaseName: name })
        await user.login(name, 'test')

        // existing collection
        await user.createCollection('places', { replicationFactor: 1 })

        try {
          const response = await collection({
            connection: user,
            name: 'places',
            options: { replicationFactor: 2 },
          })

          expect(response.collection.isArangoCollection).toEqual(true)

          const places = await user.collection('places')
          const properties = await places.properties()

          if (properties.replicationFactor) {
            expect(properties.replicationFactor).toEqual(2)
          }
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as root', () => {
    describe('with an existing collection', () => {
      it('updates waitForSync', async () => {
        const name = 'update_waitforsync_' + dbNameFromFile(__filename)

        // make the database
        await sys.createDatabase(name)

        const connection = new Database({ url, databaseName: name })
        await connection.login('root', rootPass)

        // existing collection
        await connection.createCollection('places', { waitforsync: false })

        try {
          // update waitforsync
          await collection({
            connection,
            name: 'places',
            options: { waitForSync: true },
          })

          const places = await connection.collection('places')
          const properties = await places.properties()

          expect(properties.waitForSync).toEqual(true)
        } finally {
          await sys.dropDatabase(name)
          // await deleteUser(sys, name)
        }
      })
    })
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
            options: { journalSize: 10485760, waitForSync: true },
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
  })

  describe('as a user', () => {
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
            options: { journalSize: 10485760, waitForSync: true },
          })

          const collections = await connection.collections()
          expect(collections.length).toBe(1)
          expect(collections[0].name).toEqual('places')
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing collection', () => {
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
            options: { journalSize: 10485760, waitForSync: true },
            type: 'edge',
          })

          const properties = await col.properties()
          expect(properties.type).toEqual(3)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing collection', () => {
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
            options: { journalSize: 10485760, waitForSync: true },
          })

          expect(col.isArangoCollection).toEqual(true)
          expect(message).toEqual(false)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing collection', () => {
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
            options: { journalSize: 10485760, waitForSync: true },
          })

          expect(response.message).toMatch(/Permission denied connecting/)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing collection', () => {
      it('handles read only permissions error', async () => {
        const name = 'ro_permissions_' + dbNameFromFile(__filename)
        // make the database
        await sys.createDatabase(name)
        await createUser(sys, { user: name, passwd: 'test' })
        await grantAccess(sys, name, name, 'ro')

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')

        try {
          // try to verify with ensure
          const response = await collection({
            connection,
            name: 'places',
            options: { journalSize: 10485760, waitForSync: true },
          })

          expect(response.collection).toEqual(false)
          expect(response.message).toEqual(
            "Missing permission to create collection \"places\". Check user has 'rw' not 'ro'.",
          )
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })
})
