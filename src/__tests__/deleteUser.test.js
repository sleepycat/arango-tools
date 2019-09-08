const { Database } = require('arangojs')
require('dotenv-safe').config()
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: password,
} = process.env

let sys

const randomName = `testUser${Math.random()
  .toString(36)
  .substring(7)}`

describe('createUser', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', password)
  })

  it('deletes a user from ArangoDB', async () => {
    // create a user
    await sys.route('/_api/user').post({
      user: randomName,
      passwd: 'soopersekret',
    })

    // delete the user
    await deleteUser(sys, randomName)

    // get all users
    const { body } = await sys.route('/_api/user').get()
    const names = body.result.filter(u => u.user === randomName)

    expect(names).not.toContain(randomName)
  })

  it(`doesn't barf if the user does not exist`, async () => {
    await expect(deleteUser(sys, 'sdaflajsd')).rejects.toThrowError(
      'ArangoError',
    )
  })
})
