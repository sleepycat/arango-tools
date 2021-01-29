const { dbNameFromFile } = require('../utils')
const { Database } = require('arangojs')
const { createUser } = require('../createUser')
const { deleteUser } = require('../deleteUser')
const { grantAccess } = require('../grantAccess')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: password,
} = process.env

const rootPass = password
let sys

describe('grantAccess', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)
  })

  it('gives an ArangoDB user permissions on a database', async () => {
    const name = dbNameFromFile(__filename)
    await sys.createDatabase(name)
    const db = new Database()
    db.useDatabase(name)
    db.login('root', password)

    const { user } = await createUser(sys, {
      user: name,
      passwd: 'soopersekret',
    })

    try {
      const permission = await grantAccess(sys, name, user)

      expect(permission[name]).toEqual('rw')
    } finally {
      sys.dropDatabase(name)
      await deleteUser(sys, name)
    }
  })
})
