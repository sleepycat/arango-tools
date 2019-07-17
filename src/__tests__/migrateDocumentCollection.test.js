require('dotenv-safe').config()
const { Database } = require('arangojs')
const { migrateDocumentCollection } = require('../migrateDocumentCollection')
const { dbNameFromFile } = require('../utils')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

let dbname = dbNameFromFile(__filename)

let connection

describe('migrateDocumentCollection', () => {
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

  describe('given a documentcollection migration', () => {
    it('creates a document collection', async () => {
      await migrateDocumentCollection(connection, {
        type: 'documentcollection',
        databaseName: dbname,
        name: 'places',
        options: { journalsize: 10485760, waitforsync: true },
      })

      connection.useDatabase(dbname)
      let collections = await connection.collections()
      let collectionNames = collections.map(c => c.name)

      expect(collectionNames).toContain('places')
    })
  })

  it('returns an object with save and import functions', async () => {
    let response = await migrateDocumentCollection(connection, {
      type: 'documentcollection',
      databaseName: dbname,
      name: 'places',
      options: { journalsize: 10485760, waitforsync: true },
    })

    connection.useDatabase('_system')
    await connection.dropDatabase(dbname)

    expect(response).toEqual(
      expect.objectContaining({
        places: expect.objectContaining({
          save: expect.any(Function),
          import: expect.any(Function),
        }),
      }),
    )
  })
})
