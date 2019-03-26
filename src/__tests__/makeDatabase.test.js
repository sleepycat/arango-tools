const { Database } = require('arangojs')
require('dotenv-safe').config()
const { dbNameFromFile } = require('../utils')
const { makeDatabase } = require('../makeDatabase')

const { DB_USER: user, DB_URL: url, DB_PASSWORD: password } = process.env

let rootPass = password
let sys

describe('makeDatabase', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)
  })

  it('creates a database and returns useful functions', async () => {
    let response = await makeDatabase(sys, url, {
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
        query: expect.any(Function),
        drop: expect.any(Function),
        truncate: expect.any(Function),
        collections: expect.objectContaining({
          data: expect.any(Object),
        }),
      }),
    )
  })

  it('returns a query function that lets you query the current database', async () => {
    let response = await makeDatabase(sys, url, {
      dbname: dbNameFromFile(__filename),
      user,
      password,
      documentCollections: ['foo'],
    })

    let { query, drop } = response

    let result = await query`RETURN "hello world"`
    await expect(result.all()).resolves.toEqual(['hello world'])
    await drop()
  })

  it(`doesn't fail if there is an existing database`, async () => {
    await sys.createDatabase('foo')
    let response

    try {
      response = await makeDatabase(sys, url, {
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
        query: expect.any(Function),
        drop: expect.any(Function),
        truncate: expect.any(Function),
        collections: expect.objectContaining({
          data: expect.objectContaining({
            save: expect.any(Function),
            import: expect.any(Function),
          }),
        }),
      }),
    )
  })

  it(`creates databases with non-root users`, async () => {
    let username = 'asdf'
    let response = await makeDatabase(sys, url, {
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
