require('dotenv-safe').config()
const { Database } = require('arangojs')
const { migrateEdgeCollection } = require('../migrateEdgeCollection')
const { dbNameFromFile } = require('../utils')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

const dbname = dbNameFromFile(__filename)

let connection

describe('migrateEdgeCollection', () => {
  beforeAll(async () => {
    connection = new Database({ url })
    connection.useDatabase('_system')
    connection.useBasicAuth('root', rootPass)
    await connection.createDatabase(dbname)
  })

  afterAll(async () => {
    connection.useDatabase('_system')
    await connection.dropDatabase(dbname)
  })

  describe('given an edgecollection migration', () => {
    it('creates an edge collection', async () => {
      await migrateEdgeCollection(connection, {
        type: 'edgecollection',
        databaseName: dbname,
        name: 'edges',
      })

      connection.useDatabase(dbname)
      const collections = await connection.collections()
      const collectionNames = collections.map(c => c.name)

      expect(collectionNames).toContain('edges')
    })
  })

  it('returns an object with save and import functions', async () => {
    const response = await migrateEdgeCollection(connection, {
      type: 'edgecollection',
      databaseName: dbname,
      name: 'edges',
    })

    connection.useDatabase('_system')
    await connection.dropDatabase(dbname)

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.objectContaining({
          save: expect.any(Function),
          import: expect.any(Function),
        }),
      }),
    )
  })
})
