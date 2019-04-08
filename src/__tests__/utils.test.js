require('dotenv-safe').config()
const { ArangoTools, dbNameFromFile, getFilenameFromPath } = require('../utils')

const { DB_URL: url, DB_PASSWORD: rootPass } = process.env

describe('ArangoTools', () => {
  it('returns an object with a makeDatabase property', async () => {
    expect(ArangoTools({ rootPass, url })).toHaveProperty('makeDatabase')
  })

  it('succeeds in making a database', async () => {
    let { makeDatabase } = ArangoTools({ rootPass, url })

    var response = await makeDatabase({
      dbname: 'foo',
      user: 'mike',
      password: 'secret',
      documentCollections: ['foos'],
    })

    expect(response).toEqual(
      expect.objectContaining({
        query: expect.any(Function),
        drop: expect.any(Function),
        truncate: expect.any(Function),
        collections: expect.objectContaining({
          foos: expect.objectContaining({
            save: expect.any(Function),
            import: expect.any(Function),
          }),
        }),
      }),
    )
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
