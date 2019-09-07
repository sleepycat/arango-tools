require('dotenv-safe').config()
const { Database } = require('arangojs')
const { ArangoTools, dbNameFromFile } = require('../utils')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPass,
} = process.env

describe('migrate', () => {
  it('returns a working query function', async () => {
    let { migrate } = ArangoTools({ rootPass, url })

    let name = dbNameFromFile(__filename)

    let { drop, query } = await migrate([
      {
        type: 'database',
				url,
        databaseName: name,
        users: [{ username: 'mike', passwd: 'secret' }],
      },
      {
        type: 'documentcollection',
        databaseName: name,
				url,
        name: 'places',
        options: { journalsize: 10485760, waitforsync: true },
      },
    ])

    let response = await query`RETURN "hello"`
    let result = await response.all()
    expect(result).toEqual(['hello'])
    drop()
  })

  it('sets initial state of the database based on JSON descriptions', async () => {
    let sys = new Database()
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)

    let { migrate } = ArangoTools({ rootPass, url })

    let name = dbNameFromFile(__filename)

    let response = await migrate([
      {
        type: 'database',
        databaseName: name,
        users: [{ username: 'mike', passwd: 'secret' }],
      },
      {
        type: 'documentcollection',
        databaseName: name,
        name: 'places',
        options: { journalsize: 10485760, waitforsync: true },
      },
      {
        type: 'geoindex',
        databaseName: name,
        collection: 'places',
        fields: ['pts'],
        geojson: true,
      },
      {
        type: 'graph',
        databaseName: name,
        action: 'create',
        name: 'places-graph',
        edgedefinitions: [
          { collection: 'relationships', from: ['places'], to: ['places'] },
        ],
      },
    ])

    sys.dropDatabase(name)

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
  })
})
