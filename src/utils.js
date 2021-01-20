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

const newConnection = (rootPass, url) => {
  const sys = new Database({ url })
  sys.useDatabase('_system')
  sys.useBasicAuth('root', rootPass)
  return sys
}

const ArangoTools = ({ rootPass, url = 'http://localhost:8529' }) => {
  return {
    migrate: async (migrations = []) => {
      let state = {}
      let dbResults, documentCollectionResults
      for (const migration of migrations) {
        // Add the url to each migration.
        migration.url = url
        switch (migration.type) {
          case 'database':
            dbResults = await migrateDatabase(
              newConnection(rootPass, url),
              migration,
            )
            state = assign({}, state, dbResults)
            break
          case 'documentcollection':
            documentCollectionResults = await migrateDocumentCollection(
              newConnection(rootPass, url),
              migration,
            )
            state = assign({}, state, {
              collections: documentCollectionResults,
            })
            break
          case 'edgecollection':
            var edgeCollectionResults = await migrateEdgeCollection(
              newConnection(rootPass, url),
              migration,
            )
            state = assign({}, state, {
              collections: edgeCollectionResults,
            })
            break
          case 'geoindex':
            await migrateGeoIndex(newConnection(rootPass, url), migration)
            break
          default:
            console.log('Not implemented yet: ', migration)
        }
      }
      return state
    },
  }
}

module.exports.ArangoTools = ArangoTools
