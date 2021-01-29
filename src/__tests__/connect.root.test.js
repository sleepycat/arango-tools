const { connect } = require('../connect')
const { dbNameFromFile } = require('../utils')
const { Database } = require('arangojs')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPassword,
} = process.env

describe('connect', () => {
  describe('as root', () => {
    describe('when the database exists', () => {
      it('returns a connection object', async () => {
        const name = 'existing_' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPassword)
        await sys.createDatabase(name)

        try {
          const response = await connect({
            databaseName: name,
            url,
            rootPassword,
          })

          expect(response.message).toEqual(false)
          expect(response.connection.isArangoDatabase).toEqual(true)
        } finally {
          await sys.dropDatabase(name)
        }
      })
    })

    describe('when the database does not exist', () => {
      it('creates the database and and returns a connection object', async () => {
        const { connection, message } = await connect({
          databaseName: 'doesnotexist',
          rootPassword,
          url,
          create: false,
        })

        expect(connection.isArangoDatabase).toEqual(true)
        expect(message).toEqual(false)
      })
    })
  })

  describe('with a server that does not exist', () => {
    it('returns no connection object and an appropriate message', async () => {
      const response = await connect({
        rootPassword,
        databaseName: '_system',
        url: 'http://doesnotexist:8529',
      })

      expect(response).toEqual({
        connection: false,
        message: `database server is not reachable`,
      })
    })
  })

  describe('with the bad credentials', () => {
    it('returns false and an appropriate message', async () => {
      const response = await connect({
        rootPassword: 'bad',
        databaseName: '_system',
        url,
      })

      expect(response).toEqual({
        connection: false,
        message: 'bad credentials',
      })
    })
  })
})
