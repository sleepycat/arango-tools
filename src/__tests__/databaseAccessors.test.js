const { aql, Database } = require('arangojs')
const { dbNameFromFile } = require('../utils')
const { deleteUser } = require('../deleteUser')
const { databaseAccessors } = require('../databaseAccessors')
const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPassword,
} = process.env

describe('databaseAccessors', () => {
  it('returns a query function set to the specified user', async () => {
    const name = dbNameFromFile(__filename)
    const sys = new Database({ url })
    await sys.login('root', rootPassword)
    // make the database
    await sys.createDatabase(name, {
      users: [{ user: name, passwd: 'test', active: true }],
    })

    const connection = new Database({ url, databaseName: name })
    await connection.login(name, rootPassword)

    try {
      const { query } = databaseAccessors({ connection })

      const cursor = await query`RETURN CURRENT_USER()`
      const [user] = await cursor.all()
      expect(user).toEqual(name)
    } finally {
      await sys.dropDatabase(name)
      await deleteUser(sys, name)
    }
  })

  it('returns a truncate function for the database', async () => {
    const name = dbNameFromFile(__filename)
    const sys = new Database({ url })
    await sys.login('root', rootPassword)
    // make the database
    await sys.createDatabase(name, {
      users: [{ user: name, passwd: 'test', active: true }],
    })

    const connection = new Database({ url, databaseName: name })
    await connection.login(name, rootPassword)
    const collection = await connection.createCollection('foo')

    await collection.save({ foo: 'bar' })

    try {
      const { truncate } = databaseAccessors({ connection })
      await truncate()

      const results = await connection.query(aql`FOR f IN foo RETURN f`, {
        count: true,
      })

      // There should be no results!
      expect(results.count).toEqual(0)
    } finally {
      await sys.dropDatabase(name)
      await deleteUser(sys, name)
    }
  })

  describe('without a rootConnection', () => {
    it('returns a drop function that throws', async () => {
      const name = dbNameFromFile(__filename)
      const sys = new Database({ url, databaseName: '_system' })
      await sys.login('root', rootPassword)
      // make the database
      await sys.createDatabase(name, {
        users: [{ user: name, passwd: 'droptest', active: true }],
      })

      const connection = new Database({ url, databaseName: name })
      await connection.login(name, 'droptest')

      try {
        const { drop } = databaseAccessors({ connection })
        await expect(() => drop()).toThrow(/requires root/i)
      } finally {
        await deleteUser(sys, name)
        await sys.dropDatabase(name)
      }
    })
  })

  describe('with a rootConnection', () => {
    it('returns a drop function', async () => {
      const name = dbNameFromFile(__filename)
      const sys = new Database({ url, databaseName: '_system' })
      await sys.login('root', rootPassword)
      // make the database
      await sys.createDatabase(name, {
        users: [{ user: name, passwd: 'droptest', active: true }],
      })

      const connection = new Database({ url, databaseName: name })
      await connection.login(name, 'droptest')

      try {
        const { drop } = databaseAccessors({ connection, rootConnection: sys })
        await drop()
        const databases = await sys.listDatabases()
        expect(databases).not.toContain(name)
      } finally {
        await deleteUser(sys, name)
      }
    })
  })

  it('returns a transaction function', async () => {
    const name = dbNameFromFile(__filename)
    const sys = new Database({ url })
    await sys.login('root', rootPassword)
    // make the database
    await sys.createDatabase(name, {
      users: [{ user: name, passwd: 'test', active: true }],
    })

    const connection = new Database({ url, databaseName: name })
    await connection.login(name, rootPassword)
    const collection = await connection.createCollection('foo')

    await collection.save({ foo: 'bar' })

    try {
      const { transaction } = databaseAccessors({ connection })
      const t = await transaction({ read: ['foo'] })

      expect(t.isArangoTransaction).toEqual(true)
    } finally {
      await sys.dropDatabase(name)
      await deleteUser(sys, name)
    }
  })
})
