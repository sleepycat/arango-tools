const { Database } = require('arangojs')
require('dotenv-safe').config()
const { dbNameFromFile  } = require('../utils')
const { createUser } = require('../createUser')
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: password,
} = process.env


const rootPass = password
let sys

describe('createUser', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)
  })

  it('creates a user in ArangoDB', async () => {
    const name = 'creates_a_user_' + dbNameFromFile(__filename)
    await sys.createDatabase(name)

    const randomName = `createuser_succceeds_${Math.random()
      .toString(36)
      .substring(7)}`
    const user = await createUser(sys, {
      user: randomName,
      passwd: 'soopersekret',
    })

    sys.dropDatabase(name)
    await deleteUser(sys, randomName)

    expect(user).toEqual({ active: true, extra: {}, user: randomName })
  })

  it(`doesn't barf if the user exists`, async () => {
    const name = `createuser_when_user_exists_${Math.random()
      .toString(36)
      .substring(7)}`

    // existing user
    await createUser(sys, {
      user: name,
      passwd: 'soopersekret',
    })

    try {
      await expect(
        createUser(sys, {
          user: name,
          passwd: 'soopersekret',
        }),
      ).resolves.toMatchObject({
        active: true,
        extra: {},
        user: name,
      })
    } finally {
      await deleteUser(sys, name)
    }
  })
})
