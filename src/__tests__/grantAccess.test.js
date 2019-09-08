const { parse } = require('path')
const { Database } = require('arangojs')
const { createUser } = require('../createUser')
const { grantAccess } = require('../grantAccess')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: password,
} = process.env

const generateName = () =>
  parse(__filename).base.replace(/\./g, '_') + '_' + Date.now()

const rootPass = password
let sys

describe('grantAccess', () => {
  beforeAll(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', rootPass)
  })

  it('gives an ArangoDB user permissions on a database', async () => {
    const name = generateName()
    await sys.createDatabase(name)
    const db = new Database()
    db.useDatabase(name)
    db.useBasicAuth('root', password)

    const { user } = await createUser(sys, {
      user: 'mike',
      passwd: 'soopersekret',
    })

    const permission = await grantAccess(sys, name, user)
    sys.dropDatabase(name)
    expect(permission[name]).toEqual('rw')
  })
})
