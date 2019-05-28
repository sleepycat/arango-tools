const { Database } = require('arangojs')
const { makeDatabase } = require('./makeDatabase')
const { migrateDocumentCollection } = require('./migrateDocumentCollection')
const { migrateDatabase } = require('./migrateDatabase')
const { migrateGeoIndex } = require('./migrateGeoIndex')
const { parse } = require('path')

const getFilenameFromPath = path => parse(path).base

module.exports.getFilenameFromPath = getFilenameFromPath

const dbNameFromFile = filename =>
  getFilenameFromPath(filename).replace(/\./g, '_') + '_' + Date.now()

module.exports.dbNameFromFile = dbNameFromFile

const newConnection = (rootPass, url) => {
  let sys = new Database({ url })
  sys.useDatabase('_system')
  sys.useBasicAuth('root', rootPass)
  return sys
}

const ArangoTools = ({ rootPass, url = 'http://localhost:8529' }) => {
  return {
    migrate: async (migrations = []) => {
      let state = {}
      for (let migration of migrations) {
        switch (migration.type) {
          case 'database':
            var dbResults = await migrateDatabase(
              newConnection(rootPass, url),
              migration,
            )
            state = Object.assign({}, state, dbResults)
            break
          case 'documentcollection':
            var documentCollectionResults = await migrateDocumentCollection(
              newConnection(rootPass, url),
              migration,
            )
            state = Object.assign({}, state, {
              collections: documentCollectionResults,
            })
            break
          case 'geoindex':
            await migrateGeoIndex(
              newConnection(rootPass, url),
              migration,
            )
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
