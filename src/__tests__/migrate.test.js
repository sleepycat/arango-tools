require('dotenv-safe').config()
const { Database } = require('arangojs')
const { ArangoTools, dbNameFromFile } = require('../utils')
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

describe('migrate', () => {
  it('returns a working query function', async () => {
    const { migrate } = ArangoTools({ rootPass, url })

    const name = 'migrate_returns_query_' + dbNameFromFile(__filename)

    const sys = new Database()
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)

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
