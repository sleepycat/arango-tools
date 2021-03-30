const assign = require('assign-deep')
const { Database } = require('arangojs')
const { collection } = require('./collection')
const { collectionAccessors } = require('./collectionAccessors')
const { migrateDatabase } = require('./migrateDatabase')
const { migrateGeoIndex } = require('./migrateGeoIndex')
const { searchView } = require('./searchView')
const { delimiterAnalyzer } = require('./delimiterAnalyzer')
const { parse } = require('path')

const getFilenameFromPath = (path) => parse(path).base

module.exports.getFilenameFromPath = getFilenameFromPath

const dbNameFromFile = (filename) =>
  getFilenameFromPath(filename).replace(/\./g, '_') + '_' + Date.now()

module.exports.dbNameFromFile = dbNameFromFile

const newConnection = async (rootPass, url) => {
  const sys = new Database({ url, databaseName: '_system' })
  await sys.login('root', rootPass)
  return sys
}

const ArangoTools = ({ rootPass, url = 'http://localhost:8529' }) => {
  return {
    migrate: async (migrations = []) => {
      let state = {}
      for (const migration of migrations) {
        // Add the url to each migration.
        migration.url = url
        switch (migration.type) {
          case 'database': {
            const dbResults = await migrateDatabase(
              await newConnection(rootPass, url),
              migration,
            )
            state = assign({}, state, dbResults)
            break
          }
          case 'documentcollection': {
            // connect to the db we want the collection in:
            const connection = await newConnection(rootPass, url)
            const userdb = connection.database(migration.databaseName)

            const { collection: col, message } = await collection({
              connection: userdb,
              name: migration.name,
              options: migration.options,
            })
            if (!col) throw new Error(message)

            state = Object.assign({}, state, {
              collections: {
                ...state.collections,
                ...collectionAccessors({ collection: col }),
              },
            })
            break
          }
          case 'edgecollection': {
            // connect to the db we want the collection in:
            const connection = await newConnection(rootPass, url)
            const userdb = connection.database(migration.databaseName)

            const { collection: col, message } = await collection({
              connection: userdb,
              type: 'edge',
              name: migration.name,
              options: migration.options,
            })
            if (!col) throw new Error(message)

            state = Object.assign({}, state, {
              collections: {
                ...state.collections,
                ...collectionAccessors({ collection: col }),
              },
            })
            break
          }
          case 'geoindex': {
            await migrateGeoIndex(await newConnection(rootPass, url), migration)
            break
          }
          case 'searchview': {
            const { message } = await searchView({
              connection: await newConnection(rootPass, url),
              name: migration.name,
              options: migration.options,
            })
            if (message) throw new Error(message)
            break
          }
          case 'delimiteranalyzer': {
            const target = new Database({
              url,
              databaseName: migration.databaseName,
            })
            await target.login('root', rootPass)

            const { message } = await delimiterAnalyzer({
              connection: target,
              name: migration.name,
              delimiter: migration.delimiter,
            })
            if (message) throw new Error(message)
            break
          }
          default:
            console.log('Not implemented yet: ', migration)
        }
      }
      return state
    },
  }
}

module.exports.ArangoTools = ArangoTools
