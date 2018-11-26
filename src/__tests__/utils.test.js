const { Database } = require('arangojs')
require('dotenv-safe').config()
const {
  ArangoTools,
  createUser,
  grantAccess,
  dbNameFromFile,
  getFilenameFromPath,
} = require('../utils')

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

  describe('ArangoTools.makeDatabase', () => {
    it('creates a database and returns useful functions', async () => {
      let response = await ArangoTools({ rootPass, url }).makeDatabase({
        dbname: dbNameFromFile(__filename),
        user,
        password,
        documentCollections: ['data'],
      })

      try {
        await response.drop()
      } catch (e) {
        console.log(`drop function is broken: ${e}`)
      }

      expect(response).toEqual(
        expect.objectContaining({
          db: expect.any(Object),
          drop: expect.any(Function),
          truncate: expect.any(Function),
          collections: expect.any(Object),
        }),
      )
    })

    it(`doesn't fail if there is an existing database`, async () => {
      await sys.createDatabase('foo')
      let response

      try {
        response = await ArangoTools({ rootPass, url }).makeDatabase({
          dbname: 'foo',
          user,
          password,
          documentCollections: ['data'],
        })

        await response.drop()
      } catch (e) {
        console.log(`drop function is broken: ${e}`)
      }

      expect(response).toEqual(
        expect.objectContaining({
          db: expect.any(Object),
          drop: expect.any(Function),
          truncate: expect.any(Function),
          collections: expect.any(Object),
        }),
      )
    })

    it(`creates databases with non-root users`, async () => {
      let username = 'asdf'
      let response = await ArangoTools({ rootPass, url }).makeDatabase({
        dbname: 'foo',
        user: username,
        password: 'qwerty',
        documentCollections: ['data'],
      })

      let permissions = await sys.route(`/_api/user/${username}/database`).get()

      await response.drop()

      expect(permissions.body.result).toEqual({ foo: 'rw' })
    })
  })

  describe('getFilenameFromPath', () => {
    it('returns the filename given an absolute path', async () => {
      expect(getFilenameFromPath(__filename)).toEqual('utils.test.js')
    })
  })

  describe('createUser', () => {
    it('creates a user in ArangoDB', async () => {
      let user = await createUser(sys, {
        user: 'mike',
        passwd: 'soopersekret',
      })
      expect(user).toEqual({ active: true, extra: {}, user: 'mike' })
    })
  })

  describe('grantAccess', () => {
    it('gives an ArangoDB user permissions on a database', async () => {
      let { user } = await createUser(sys, {
        user: 'mike',
        passwd: 'soopersekret',
      })
      let permission = await grantAccess(sys, '_system', user)
      expect(permission).toEqual({ _system: 'rw', code: 200, error: false })
    })
  })

  describe('dbNameFromFile', () => {
    it('generates a collision resistant database name given a filename', async () => {
      expect(dbNameFromFile(__filename)).toMatch(/utils_test_js_\d{13}/)
    })
  })
})
