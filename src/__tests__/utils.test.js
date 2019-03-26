const { Database } = require('arangojs')
require('dotenv-safe').config()
const { ArangoTools, dbNameFromFile, getFilenameFromPath } = require('../utils')

const { DB_USER: user, DB_URL: url, DB_PASSWORD: password } = process.env

let rootPass = password
let sys

describe('ArangoTools', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', 'test')
  })

  it('returns an object with a makeDatabase property', async () => {
    expect(ArangoTools({ rootPass, url })).toHaveProperty('makeDatabase')
  })

  describe('getFilenameFromPath', () => {
    it('returns the filename given an absolute path', async () => {
      expect(getFilenameFromPath(__filename)).toEqual('utils.test.js')
    })
  })

  describe('dbNameFromFile', () => {
    it('generates a collision resistant database name given a filename', async () => {
      expect(dbNameFromFile(__filename)).toMatch(/utils_test_js_\d{13}/)
    })
  })
})
