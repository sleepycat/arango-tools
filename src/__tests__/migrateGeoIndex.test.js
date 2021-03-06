require('dotenv-safe').config()
const { Database } = require('arangojs')
const { dbNameFromFile } = require('../utils')
const { migrateGeoIndex } = require('../migrateGeoIndex')

const { ARANGOTOOLS_DB_PASSWORD: rootPass } = process.env

describe('migrateGeoIndex', () => {
  describe('with an existing collection', () => {
    it('creates a geo index', async () => {
      const collectionName = 'places'

      // set up a database and collection
      const sys = new Database()
      sys.useDatabase('_system')
      sys.useBasicAuth('root', rootPass)

      const dbname = dbNameFromFile(__filename)
      await sys.createDatabase(dbname)
      const db = new Database()
      db.useDatabase(dbname)
      db.useBasicAuth('root', rootPass)

      const col = db.collection(collectionName)
      await col.create()

      // Our migration to test
      const migration = {
        type: 'geoindex',
        databaseName: dbname,
        collection: collectionName,
        options: {
          fields: ['pts'],
        },
      }

      try {
        const { error, geoJson } = await migrateGeoIndex(sys, migration)

        expect(error).toEqual(false)
        expect(geoJson).toEqual(false)
      } finally {
        sys.useDatabase('_system')
        await sys.dropDatabase(dbname)
      }
    })

    it('creates a geo index with geojson', async () => {
      const collectionName = 'places'

      // set up a database and collection
      const sys = new Database()
      sys.useDatabase('_system')
      sys.useBasicAuth('root', rootPass)

      const dbname = dbNameFromFile(__filename)
      await sys.createDatabase(dbname)
      const db = new Database()
      db.useDatabase(dbname)
      db.useBasicAuth('root', rootPass)

      const col = db.collection(collectionName)
      await col.create()

      // Our migration to test
      const migration = {
        type: 'geoindex',
        databaseName: dbname,
        collection: collectionName,
        options: {
          fields: ['pts'],
          geoJson: true,
        },
      }

      try {
        const index = await migrateGeoIndex(sys, migration)
        expect(index.geoJson).toEqual(true)
      } finally {
        sys.useDatabase('_system')
        await sys.dropDatabase(dbname)
      }
    })
  })

  describe('with a collection that does not exist', () => {
    it('throws a descriptive error', async () => {
      const collectionName = 'places'

      // set up a database and collection
      const sys = new Database()
      sys.useDatabase('_system')
      sys.useBasicAuth('root', rootPass)

      const dbname = dbNameFromFile(__filename)
      await sys.createDatabase(dbname)
      const db = new Database()
      db.useDatabase(dbname)
      db.useBasicAuth('root', rootPass)

      // No collection created! Expect an error!
      // let col = db.collection(collectionName)
      // await col.create()

      // Our migration to test
      const migration = {
        type: 'geoindex',
        databaseName: dbname,
        collection: collectionName,
        options: {
          fields: ['pts'],
          geoJson: true,
        },
      }

      try {
        await expect(migrateGeoIndex(sys, migration)).rejects.toThrowError(
          /Can't add a geoindex to a collection that doesn't exist/,
        )
      } finally {
        sys.useDatabase('_system')
        await sys.dropDatabase(dbname)
      }
    })
  })
})
