require('dotenv-safe').config()
const { Database } = require('arangojs')
const { dbNameFromFile } = require('../utils')
const { migrateGeoIndex } = require('../migrateGeoIndex')

const { DB_PASSWORD: rootPass } = process.env

describe('migrateGeoIndex', () => {
  describe('with an existing collection', () => {
    it('creates a geo index', async () => {
      const collectionName = 'places'

      // set up a database and collection
      let sys = new Database()
      sys.useDatabase('_system')
      sys.useBasicAuth('root', rootPass)

      let dbname = dbNameFromFile(__filename)
      await sys.createDatabase(dbname)
      let db = new Database()
      db.useDatabase(dbname)
      db.useBasicAuth('root', rootPass)

      let col = db.collection(collectionName)
      await col.create()

      // Our migration to test
      let migration = {
        type: 'geoindex',
        databaseName: dbname,
        collection: collectionName,
        fields: ['pts'],
      }

      const { error, geoJson } = await migrateGeoIndex(sys, migration)

      expect(error).toEqual(false)
      expect(geoJson).toEqual(false)
    })

    it('creates a geo index with geojson', async () => {
      const collectionName = 'places'

      // set up a database and collection
      let sys = new Database()
      sys.useDatabase('_system')
      sys.useBasicAuth('root', rootPass)

      let dbname = dbNameFromFile(__filename)
      await sys.createDatabase(dbname)
      let db = new Database()
      db.useDatabase(dbname)
      db.useBasicAuth('root', rootPass)

      let col = db.collection(collectionName)
      await col.create()

      // Our migration to test
      let migration = {
        type: 'geoindex',
        databaseName: dbname,
        collection: collectionName,
        fields: ['pts'],
        geojson: true,
      }

      const index = await migrateGeoIndex(sys, migration)

      expect(index.geoJson).toEqual(true)
    })
  })

  describe('with a collection that does not exist', () => {
    it('throws a descriptive error', async () => {
      const collectionName = 'places'

      // set up a database and collection
      let sys = new Database()
      sys.useDatabase('_system')
      sys.useBasicAuth('root', rootPass)

      let dbname = dbNameFromFile(__filename)
      await sys.createDatabase(dbname)
      let db = new Database()
      db.useDatabase(dbname)
      db.useBasicAuth('root', rootPass)

      // No collection created! Expect an error!
      // let col = db.collection(collectionName)
      // await col.create()

      // Our migration to test
      let migration = {
        type: 'geoindex',
        databaseName: dbname,
        collection: collectionName,
        fields: ['pts'],
        geojson: true,
      }

      await expect(migrateGeoIndex(sys, migration)).rejects.toThrowError(
        /Can't add a geoindex to a collection that doesn't exist/,
      )
    })
  })
})
