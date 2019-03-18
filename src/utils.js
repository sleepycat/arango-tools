const { Database } = require('arangojs')
const { makeDatabase } = require('./makeDatabase')
const { parse } = require('path')

const getFilenameFromPath = path => parse(path).base

module.exports.getFilenameFromPath = getFilenameFromPath

const dbNameFromFile = filename =>
  getFilenameFromPath(filename).replace(/\./g, '_') + '_' + Date.now()

module.exports.dbNameFromFile = dbNameFromFile

const ArangoTools = ({ rootPass, url }) => {
  let sys = new Database({ url })
  sys.useDatabase('_system')
  sys.useBasicAuth('root', rootPass)

  return {
    makeDatabase: options => makeDatabase(sys, url, options),
  }
}

module.exports.ArangoTools = ArangoTools
