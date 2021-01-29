const { aql } = require('arangojs')
const { connect } = require('../connect')
const { dbNameFromFile } = require('../utils')
const { deleteUser } = require('../deleteUser')
const { Database } = require('arangojs')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPassword,
} = process.env

describe('connect', () => {
  describe('as a user', () => {
    describe('when the database does not exist', () => {
      it('returns false and a descriptive message', async () => {
        const response = await connect({
          as: {
            username: 'mike',
            password: 'test',
          },
          databaseName: 'doesnotexist',
          url,
        })

        expect(response).toEqual({
          connection: false,
          message: 'no such database',
        })
      })
    })
  })

  describe('as a user', () => {
    describe('when server does not exist', () => {
      it('returns false and a descriptive message', async () => {
        const response = await connect({
          as: {
            username: 'mike',
            password: 'test',
          },
          databaseName: 'doesnotexist',
          url: 'http://doesnotexist:8529',
        })

        expect(response).toEqual({
          connection: false,
          message: 'database server is not reachable',
        })
      })
    })
  })

  describe('as a user', () => {
    describe('when the database exists', () => {
      it('returns a connection object', async () => {
        const name = 'existing_database_returns_' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPassword)
        // create the database and grant access to the mike user
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test' }],
        })

        // try to connect
        try {
          const response = await connect({
            as: {
              username: name,
              password: 'test',
            },
            databaseName: name,
            url,
          })

          expect(response.message).toEqual(false)
          expect(response.connection.isArangoDatabase).toEqual(true)
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a user', () => {
    it('returns a connection using the specified user', async () => {
      const name = 'query_as_user_' + dbNameFromFile(__filename)
      const sys = new Database({ url, databaseName: '_system' })
      await sys.login('root', rootPassword)
      // create the database and grant access to the mike user
      await sys.createDatabase(name, {
        users: [{ user: name, passwd: 'test' }],
      })

      try {
        const { connection } = await connect({
          as: {
            username: name,
            password: 'test',
          },
          databaseName: name,
          url,
        })

        const cursor = await connection.query(aql`RETURN CURRENT_USER()`)
        const [user] = await cursor.all()

        expect(user).toEqual(name)
      } finally {
        await deleteUser(sys, name)
        await sys.dropDatabase(name)
      }
    })
  })

  describe('as a user', () => {
    describe('when the database does not exist', () => {
      describe('and the rootPassword is supplied', () => {
        it('returns a connection object', async () => {
          const name = 'user_plus_rootpass_' + dbNameFromFile(__filename)
          const sys = new Database({ url, databaseName: '_system' })
          await sys.login('root', rootPassword)

          // try to connect
          try {
            const response = await connect({
              as: {
                username: name,
                password: 'test',
              },
              databaseName: name,
              url,
              rootPassword,
            })

            expect(response.message).toEqual(false)
            expect(response.connection.isArangoDatabase).toEqual(true)
          } finally {
            // cleanup
            await sys.dropDatabase(name)
            await deleteUser(sys, name)
          }
        })
      })
    })

    describe('when the database exists', () => {
      describe('with bad credentials', () => {
        it('returns a descriptive error', async () => {
          const name = 'good_errors_for_bad_creds_' + dbNameFromFile(__filename)
          const sys = new Database({ url, databaseName: '_system' })
          await sys.login('root', rootPassword)
          // create the database and grant access to the mike user
          await sys.createDatabase(name, {
            users: [{ user: name, passwd: 'test' }],
          })

          // try to connect
          try {
            const response = await connect({
              as: {
                username: name,
                password: 'wrong',
              },
              databaseName: name,
              url,
            })

            expect(response).toEqual({
              connection: false,
              message: 'bad credentials',
            })
          } finally {
            await deleteUser(sys, name)
            await sys.dropDatabase(name)
          }
        })
      })
    })
  })
})
