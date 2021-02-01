const assign = require('assign-deep')
const { Database } = require('arangojs')
const { migrateDocumentCollection } = require('./migrateDocumentCollection')
const { migrateEdgeCollection } = require('./migrateEdgeCollection')
const { migrateDatabase } = require('./migrateDatabase')
const { migrateGeoIndex } = require('./migrateGeoIndex')
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
            const documentCollectionResults = await migrateDocumentCollection(
              await newConnection(rootPass, url),
              migration,
            )
            state = assign({}, state, {
              collections: documentCollectionResults,
            })
            break
          }
          case 'edgecollection': {
            const edgeCollectionResults = await migrateEdgeCollection(
              await newConnection(rootPass, url),
              migration,
            )
            state = assign({}, state, {
              collections: edgeCollectionResults,
            })
            break
          }
          case 'geoindex': {
            await migrateGeoIndex(await newConnection(rootPass, url), migration)
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
