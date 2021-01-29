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

const rootPass = password
let sys

describe('createUser', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)
  })

  it('creates a user in ArangoDB', async () => {
    const name = generateName()
    await sys.createDatabase(name)

    const randomName = `createuser_succceeds_{Math.random().toString(36).substring(7)}`
    const user = await createUser(sys, {
      user: randomName,
      passwd: 'soopersekret',
    })

    sys.dropDatabase(name)
    await deleteUser(sys, randomName)

    expect(user).toEqual({ active: true, extra: {}, user: randomName })
  })

  it(`doesn't barf if the user exists`, async () => {

    const name = `createuser_when_user_exists_${Math.random().toString(36).substring(7)}`

    await createUser(sys, {
      user: name,
      passwd: 'soopersekret',
    })

    try {
      expect(async () => {
        await createUser(sys, {
          user: name,
          passwd: 'soopersekret',
        })
      }).not.toThrow()
    } finally {
      await deleteUser(sys, name)
    }
  })
})
