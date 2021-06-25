const { Database } = require('arangojs')
const { dbNameFromFile } = require('../utils')
const { connectTo } = require('../connectTo')
const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPassword,
} = process.env

describe('connectTo', () => {
  it('returns db accessors', async () => {
    const name = dbNameFromFile(__filename)
    const sys = new Database({ url })
    await sys.login('root', rootPassword)

    // make the database
    await sys.createDatabase(name, {
      users: [{ user: name, passwd: 'test', active: true }],
    })

    const accessors = await connectTo({
      databaseName: name,
      as: {
        username: name,
        password: 'test',
      },
    })

    await expect(accessors).toMatchObject({
      query: expect.any(Function),
      truncate: expect.any(Function),
      drop: expect.any(Function),
      transaction: expect.any(Function),
    })
  })
})

describe('connectTo', () => {
  it('throws when it cannot connect', async () => {
    await expect(
      connectTo({
        databaseName: 'does-not-exist',
        as: {
          username: 'mike',
          password: 'test',
        },
      }),
    ).rejects.toThrow('no such database')
  })
})
