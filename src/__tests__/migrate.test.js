require('dotenv-safe').config()
const { Database } = require('arangojs')
const { ArangoTools, dbNameFromFile } = require('../utils')
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

async function createDatabase({
  called,
  withUsers = [],
  connectTo,
  withRootPass,
}) {
  if (!connectTo || !withRootPass) {
    const { ARANGOTOOLS_DB_URL, ARANGOTOOLS_DB_PASSWORD } = process.env
    connectTo = ARANGOTOOLS_DB_URL
    withRootPass = ARANGOTOOLS_DB_PASSWORD
  }
  if (!connectTo || !withRootPass)
    throw new Error(
      `createDatabase wasn't passed credentials and ARANGOTOOLS_DB_URL and ARANGOTOOLS_DB_PASSWORD wheren't defined in the environment.`,
    )

  const sys = new Database({ url: connectTo })
  await sys.login('root', withRootPass)
  // make the database
  await sys.createDatabase(called, {
    users: withUsers,
  })

  const userdb = new Database({ url, databaseName: called })
  await userdb.login(called, 'test')

  return { system: sys, db: userdb }
}

async function createCollection({ called, inDatabase, withOptions = {} }) {
  const collection = inDatabase.collection(called, withOptions)
  await collection.create()
  return collection
}

describe('migrate', () => {
  describe('as a user', () => {
    describe('with an existing database', () => {
      it('updates mutable collection properties', async () => {
        const name = 'collection_properties_' + dbNameFromFile(__filename)

        const { system, db: userdb } = await createDatabase({
          called: name,
          withUsers: [{ user: name, passwd: 'test', active: true }],
        })

        // a test schema from the docs
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

        await createCollection({
          called: 'places',
          inDatabase: userdb,
          withOptions: {
            schema: null,
            waitForSync: false,
          },
        })

        const { migrate } = ArangoTools({ rootPass, url })
        try {
          await migrate([
            {
              type: 'database',
              url,
              databaseName: name,
              users: [{ username: name, passwd: 'test' }],
            },
            {
              type: 'documentcollection',
              databaseName: name,
              url,
              name: 'places',
              options: { schema, waitForSync: true },
            },
          ])

          const conn = new Database({ url, databaseName: name })
          await conn.login(name, 'test')
          const properties = await conn.collection('places').properties()

          expect(properties).toMatchObject({ schema, waitForSync: true })
        } finally {
          await system.dropDatabase(name)
          await deleteUser(system, name)
        }
      })
    })
  })

  describe('as root', () => {
    it('returns a working query function', async () => {
      const { migrate } = ArangoTools({ rootPass, url })

      const name = 'migrate_returns_query_' + dbNameFromFile(__filename)

      const sys = new Database({ url })
      await sys.login('root', rootPass)

      try {
        const { query } = await migrate([
          {
            type: 'database',
            url,
            databaseName: name,
            users: [{ username: name, passwd: 'secret' }],
          },
          {
            type: 'documentcollection',
            databaseName: name,
            url,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          },
        ])

        const response = await query`RETURN "hello"`
        const result = await response.all()
        expect(result).toEqual(['hello'])
      } finally {
        await sys.dropDatabase(name)
        await deleteUser(sys, name)
      }
    })
  })

  describe('as root', () => {
    it('creates a delimiter analyzer', async () => {
      const sys = new Database({ url })
      sys.login('root', rootPass)

      const { migrate } = ArangoTools({ rootPass, url })

      const name = 'migrate_creates_delimiter_' + dbNameFromFile(__filename)

      try {
        await migrate([
          {
            type: 'database',
            databaseName: name,
            users: [{ username: name, passwd: 'secret' }],
          },
          {
            type: 'documentcollection',
            databaseName: name,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          },
          {
            type: 'delimiteranalyzer',
            databaseName: name,
            name: 'my-delimiter-analyzer',
            delimiter: ';',
          },
        ])

        const db = new Database({ url, databaseName: name })
        await db.login('root', rootPass)

        const analyzer = db.analyzer('my-delimiter-analyzer')
        const definition = await analyzer.get()
        expect(definition.properties.delimiter).toEqual(';')
      } finally {
        await sys.dropDatabase(name)
        await deleteUser(sys, name)
      }
    })
  })

  describe('as root', () => {
    it('sets initial state of the database based on JSON descriptions', async () => {
      const sys = new Database({ url })
      sys.login('root', rootPass)

      const { migrate } = ArangoTools({ rootPass, url })

      const name = 'inital_state_from_json_' + dbNameFromFile(__filename)

      try {
        const response = await migrate([
          {
            type: 'database',
            databaseName: name,
            users: [{ username: name, passwd: 'secret' }],
          },
          {
            type: 'documentcollection',
            databaseName: name,
            name: 'places',
            options: { journalsize: 10485760, waitforsync: true },
          },
          {
            type: 'edgecollection',
            databaseName: name,
            name: 'edges',
          },
          {
            type: 'searchview',
            databaseName: name,
            name: 'myview',
            options: {},
          },
          {
            type: 'geoindex',
            databaseName: name,
            collection: 'places',
            options: {
              fields: ['pts'],
              geoJson: true,
            },
          },
        ])

        expect(response).toEqual(
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
      } finally {
        await sys.dropDatabase(name)
        await deleteUser(sys, name)
      }
    })
  })
})
