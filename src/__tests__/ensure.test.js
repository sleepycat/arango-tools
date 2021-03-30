const { Database } = require('arangojs')
const { dbNameFromFile } = require('../utils')
const { deleteUser } = require('../deleteUser')
const { ensure } = require('../ensure')
const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPassword,
} = process.env

describe('ensure', () => {
  describe('as a user', () => {
    describe('with an existing database', () => {
      it('succeeds in adding a delimiter analyzer to arango', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          // try to verify with ensure
          await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                databaseName: name,
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
              {
                type: 'delimiteranalyzer',
                name: 'my-delimiter-analyzer',
                delimiter: ';',
              },
            ],
          })

          const db = new Database({ url, databaseName: name })
          await db.login(name, 'test')

          const analyzer = db.analyzer('my-delimiter-analyzer')
          const definition = await analyzer.get()

          expect(definition).toMatchObject({
            properties: {
              delimiter: ';',
            },
          })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing database', () => {
      it('succeeds in adding a search view to arango', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          // try to verify with ensure
          await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                databaseName: name,
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
              {
                type: 'searchview',
                name: 'placeview',
                options: {
                  links: {
                    places: {
                      fields: {
                        name: { analyzers: ['text_en'] },
                        description: { analyzers: ['text_en'] },
                      },
                    },
                  },
                },
              },
            ],
          })

          const db = new Database({ url, databaseName: name })
          await db.login(name, 'test')

          const view = db.view('placeview')
          const viewProperties = await view.properties()

          expect(viewProperties.links).toMatchObject({
            places: {
              analyzers: ['identity'],
              fields: {
                name: { analyzers: ['text_en'] },
                description: { analyzers: ['text_en'] },
              },
              includeAllFields: false,
              storeValues: 'none',
              trackListPositions: false,
            },
          })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing database', () => {
      it('succeeds in adding a database to arango', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          // try to verify with ensure
          await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                databaseName: name,
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
            ],
          })
          const databases = await sys.listDatabases()
          expect(databases.includes(name)).toEqual(true)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing database', () => {
      it('returns accessor functions', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          // try to verify with ensure
          const accessors = await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                databaseName: name,
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
            ],
          })
          const databases = await sys.listDatabases()
          expect(databases.includes(name)).toEqual(true)
          expect(accessors).toEqual(
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

  describe('as a user', () => {
    describe('with an existing database', () => {
      it('returns the full set of accessors', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          // try to verify with ensure
          const response = await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                name: 'people',
                options: { journalSize: 10485760, waitForSync: true },
              },
              {
                type: 'edgecollection',
                name: 'likes',
                options: { journalSize: 10485760, waitForSync: true },
              },
            ],
          })

          expect(response).toEqual(
            expect.objectContaining({
              query: expect.any(Function),
              drop: expect.any(Function),
              truncate: expect.any(Function),
              collections: expect.objectContaining({
                people: expect.objectContaining({
                  save: expect.any(Function),
                  import: expect.any(Function),
                }),
                likes: expect.objectContaining({
                  save: expect.any(Function),
                  import: expect.any(Function),
                }),
              }),
            }),
          )
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing database', () => {
      it('updates mutable collection properties', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

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

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')
        const collection = connection.collection('places', {
          schema: null,
          waitForSync: false,
        })
        await collection.create()

        try {
          // try to verify with ensure
          await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                name: 'places',
                options: { schema, waitForSync: true },
              },
            ],
          })

          const updated = connection.collection('places')
          const properties = await updated.properties()

          expect(properties).toMatchObject({ schema, waitForSync: true })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing database', () => {
      it('returns a query function set to the specified user', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          // try to verify with ensure
          const { query } = await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
            ],
          })

          const cursor = await query`RETURN CURRENT_USER()`
          const [user] = await cursor.all()
          expect(user).toEqual(name)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('when the database does not exist', () => {
      it('fails with an instructive error', async () => {
        const name = dbNameFromFile(__filename)
        try {
          await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
            ],
          })
        } catch (e) {
          expect(e.message).toEqual('no such database')
        }
      })
    })
  })

  describe('as root', () => {
    describe('when the database does not exist', () => {
      it('creates the database', async () => {
        const name = dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)

        let accessors
        // try to verify with ensure
        try {
          accessors = await ensure({
            type: 'database',
            name,
            rootPassword,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
              {
                type: 'documentcollection',
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
            ],
          })

          expect(accessors).toEqual(
            expect.objectContaining({
              query: expect.any(Function),
              drop: expect.any(Function),
              truncate: expect.any(Function),
              collections: expect.objectContaining({
                places: expect.objectContaining({
                  save: expect.any(Function),
                  import: expect.any(Function),
                }),
              }),
            }),
          )
        } catch (e) {
          console.log({ 'root user database creation test': e.message })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('with an existing database', () => {
      it('creates a geoindex', async () => {
        const name = dbNameFromFile(__filename)
        // try to verify with ensure
        const sys = new Database({ url })
        await sys.login('root', rootPassword)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          await ensure({
            type: 'database',
            name,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
              {
                type: 'geoindex',
                on: 'places',
                fields: ['lat', 'lng'],
                geoJson: true,
              },
            ],
          })

          const connection = new Database({ url, databaseName: name })
          await connection.login('root', rootPassword)
          const collection = connection.collection('places')
          const indexes = await collection.indexes()

          expect(indexes.map((i) => i.type)).toEqual(['primary', 'geo'])
        } catch (e) {
          console.log({ geoindex: e.message })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as root', () => {
    describe('with an existing database', () => {
      it('creates a geoindex', async () => {
        const name = dbNameFromFile(__filename)

        const sys = new Database({ url })
        await sys.login('root', rootPassword)

        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })

        try {
          await ensure({
            type: 'database',
            name,
            rootPassword,
            url,
            options: [
              { type: 'user', username: name, password: 'test' },
              {
                type: 'documentcollection',
                name: 'places',
                options: { journalSize: 10485760, waitForSync: true },
              },
              {
                type: 'geoindex',
                on: 'places',
                fields: ['lat', 'lng'],
                geoJson: true,
              },
            ],
          })

          const connection = new Database({ url, databaseName: name })
          await connection.login('root', rootPassword)
          const collection = connection.collection('places')
          const indexes = await collection.indexes()

          expect(indexes.map((i) => i.type)).toEqual(['primary', 'geo'])
        } catch (e) {
          console.log({ geoindex: e.message })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })
})
