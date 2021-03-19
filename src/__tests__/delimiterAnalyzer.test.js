const { delimiterAnalyzer } = require('../delimiterAnalyzer')
const { dbNameFromFile } = require('../utils')
const { Database } = require('arangojs')
const { grantAccess } = require('../grantAccess')
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPassword,
} = process.env

describe('delimiteranalyzer', () => {
  describe('as root', () => {
    describe('when the analyzer does not exist', () => {
      it('returns the analyzer and no message', async () => {
        const name = 'delimiteranalyzer_' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPassword)
        await sys.createDatabase(name)

        const connection = new Database({ url, databaseName: name })
        await connection.login('root', rootPassword)

        try {
          const response = await delimiterAnalyzer({
            connection,
            name: 'my-delimiter-analyzer',
            delimiter: ';',
          })

          expect(response.message).toEqual(false)
          expect(response.analyzer.isArangoAnalyzer).toEqual(true)
        } finally {
          await sys.dropDatabase(name)
        }
      })
    })
  })

  describe('as root', () => {
    describe('when the analyzer exists', () => {
      it('returns the analyzer and no message', async () => {
        const name = 'delimiteranalyzer_exists_' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPassword)
        await sys.createDatabase(name)

        const connection = new Database({ url, databaseName: name })
        await connection.login('root', rootPassword)
        await connection.createAnalyzer('as-root-analyzer-exists', {
          type: 'delimiter',
          properties: { delimiter: ';' },
        })

        try {
          const response = await delimiterAnalyzer({
            connection,
            name: 'as-root-analyzer-exists',
            delimiter: ';',
          })

          expect(response.message).toEqual(false)
          expect(response.analyzer.isArangoAnalyzer).toEqual(true)
        } finally {
          await sys.dropDatabase(name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('when the analyzer exists', () => {
      it('returns the analyzer and no message', async () => {
        const name = 'user_delimiter_exists' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPassword)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })
        await grantAccess(sys, name, name, 'rw')

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')
        await connection.createAnalyzer('existing_delimiter', {
          type: 'delimiter',
          properties: { delimiter: ',' },
        })

        try {
          const response = await delimiterAnalyzer({
            connection,
            name: 'existing_delimiter',
            delimiter: ',',
          })

          expect(response.message).toEqual(false)
          expect(response.analyzer.isArangoAnalyzer).toEqual(true)
        } finally {
          await deleteUser(sys, name)
          await sys.dropDatabase(name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('when the existing analyzer differs', () => {
      it('the analyzer is updated', async () => {
        const name = 'analyzer_update' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPassword)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })
        await grantAccess(sys, name, name, 'rw')

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')
        await connection.createAnalyzer('existing', {
          type: 'delimiter',
          properties: { delimiter: ',' },
        })

        try {
          await delimiterAnalyzer({
            connection,
            name: 'existing',
            delimiter: ';',
          })

          const analyzer = connection.analyzer('existing')
          const definition = await analyzer.get()

          expect(definition).toMatchObject({ properties: { delimiter: ';' } })
        } finally {
          await deleteUser(sys, name)
          await sys.dropDatabase(name)
        }
      })
    })
  })

  describe('as a user', () => {
    describe('when the analyzer does not exist', () => {
      it('returns false with a message', async () => {
        const name = 'user_delimiteranalyzer_' + dbNameFromFile(__filename)
        const sys = new Database({ url, databaseName: '_system' })
        await sys.login('root', rootPassword)
        // make the database
        await sys.createDatabase(name, {
          users: [{ user: name, passwd: 'test', active: true }],
        })
        await grantAccess(sys, name, name, 'ro')

        const connection = new Database({ url, databaseName: name })
        await connection.login(name, 'test')

        try {
          const response = await delimiterAnalyzer({
            connection,
            name: 'ro-user-analyzer',
            delimiter: ';',
          })

          expect(response.message).toMatch(/Insufficient user permissions/i)
          expect(response.analyzer).toEqual(false)
        } finally {
          await deleteUser(sys, name)
          await sys.dropDatabase(name)
        }
      })
    })
  })
})
