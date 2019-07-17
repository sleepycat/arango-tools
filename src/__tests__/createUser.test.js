const { parse } = require('path')
const { Database } = require('arangojs')
require('dotenv-safe').config()
const { createUser } = require('../createUser')
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: password,
} = process.env

const generateName = () =>
  parse(__filename).base.replace(/\./g, '_') + '_' + Date.now()

let rootPass = password
let sys

describe('createUser', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)
  })

  it('creates a user in ArangoDB', async () => {
    let name = generateName()
    await sys.createDatabase(name)
    let db = new Database()
    db.useDatabase(name)
    db.useBasicAuth('root', password)

    let randomName = `testUser${Math.random()
      .toString(36)
      .substring(7)}`
    let user = await createUser(db, {
      user: randomName,
      passwd: 'soopersekret',
    })

    sys.dropDatabase(name)
    await deleteUser(sys, randomName)

    expect(user).toEqual({ active: true, extra: {}, user: randomName })
  })

  it(`doesn't barf if the user exists`, async () => {
    await createUser(sys, {
      user: 'mike',
      passwd: 'soopersekret',
    })
    expect(async () => {
      await createUser(sys, {
        user: 'mike',
        passwd: 'soopersekret',
      })
    }).not.toThrow()
  })
})
