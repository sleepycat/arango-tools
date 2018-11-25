const { Database } = require('arangojs')
const { parse } = require('path')

const getFilenameFromPath = path => parse(path).base

module.exports.getFilenameFromPath = getFilenameFromPath

const dbNameFromFile = filename =>
  getFilenameFromPath(filename).replace(/\./g, '_') + '_' + Date.now()

module.exports.dbNameFromFile = dbNameFromFile

function ArangoTools({ rootPass, url }) {
  let sys = new Database({ url })
  sys.useDatabase('_system')
  sys.useBasicAuth('root', 'test')

  return {
    makeDatabase: async ({
      dbname,
      user = 'root',
      password = 'test',
      documentCollections = [],
    }) => {
      try {
        await sys.createDatabase(dbname, [{ user }])
      } catch (e) {
        console.log('creating db is effed up', e.message)
      }

      let newdb
      try {
        newdb = new Database({ url })
        newdb.useDatabase(dbname)
        newdb.useBasicAuth('root', 'test')
      } catch (e) {
        console.log(`creating newdb failed: ${e}`)
      }

      let cols = await Promise.all(
        documentCollections.map(async c => {
          // Make a collection instance to put stuff in.
          let col = newdb.collection(c)
          // Make sure the instance has a real collection backing it.
          try {
            await col.create()
          } catch (e) {
            console.log(`col create blew up: ${e.message}`, col)
            console.log(`newdb is:`, newdb)
          }
          return col
        }),
      )

      // Return the db, collections and functions to drop and truncate it.
      return {
        db: newdb,
        collections: cols,
        drop: () => sys.dropDatabase(dbname),
        truncate: () => newdb.truncate(),
      }
    },
  }
}

module.exports.ArangoTools = ArangoTools
