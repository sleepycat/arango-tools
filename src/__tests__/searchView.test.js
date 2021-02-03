const { Database } = require('arangojs')
const { searchView } = require('../searchView')
const { dbNameFromFile } = require('../utils')
const { grantAccess } = require('../grantAccess')
const { createUser } = require('../createUser')
const { deleteUser } = require('../deleteUser')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: rootPassword,
} = process.env

describe('searchView', () => {
  describe('as a user', () => {
    describe('when a searchview exists', () => {
      it('returns the searchview', async () => {
        const name = 'existing_user_searchview_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        await sys.createDatabase(name, {
          users: [{ username: name, passwd: 'test' }],
        })

        const userConnection = new Database({ url, databaseName: name })
        await userConnection.login(name, 'test')
        // Existing searchView!
        await userConnection.createView('foo')

        try {
          const response = await searchView({
            connection: userConnection,
            name: 'foo',
          })

          expect(response.message).toEqual(false)
          expect(response.view.isArangoView).toEqual(true)
          expect(response.view.name).toEqual('foo')
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as a read only user', () => {
    describe('when no searchview exists', () => {
      it('returns a useful error', async () => {
        const name = 'user_searchview_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        // create db
        await sys.createDatabase(name)
        // create user
        await createUser(sys, { user: name, passwd: 'test' })
        // grant read only access to user
        await grantAccess(sys, name, name, 'ro')

        const userConnection = new Database({ url, databaseName: name })
        await userConnection.login(name, 'test')
        // No searchview!
        // await userConnection.createView('foo')

        try {
          const response = await searchView({
            connection: userConnection,
            name: 'foo',
          })

          expect(response).toEqual({
            view: false,
            message: 'insufficient rights to create view',
          })
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })
  describe('as a user', () => {
    describe('when no searchview exists', () => {
      it('creates a searchview', async () => {
        const name = 'user_searchview_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        await sys.createDatabase(name, {
          users: [{ username: name, passwd: 'test' }],
        })

        const userConnection = new Database({ url, databaseName: name })
        await userConnection.login(name, 'test')
        // No searchview!
        // await userConnection.createView('foo')

        try {
          const response = await searchView({
            connection: userConnection,
            name: 'foo',
          })

          expect(response.message).toEqual(false)
          expect(response.view.isArangoView).toEqual(true)
          expect(response.view.name).toEqual('foo')
        } finally {
          await sys.dropDatabase(name)
          await deleteUser(sys, name)
        }
      })
    })
  })

  describe('as root', () => {
    describe('when no searchview exists', () => {
      it('creates a searchview', async () => {
        const name = 'user_searchview_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        await sys.createDatabase(name)

        try {
          const response = await searchView({
            connection: sys, // use roots connection
            name: 'foo',
          })

          expect(response.message).toEqual(false)
          expect(response.view.isArangoView).toEqual(true)
          expect(response.view.name).toEqual('foo')
        } finally {
          await sys.dropDatabase(name)
        }
      })
    })
    describe('when a searchview exists', () => {
      it('returns the searchview', async () => {
        const name = 'user_searchview_' + dbNameFromFile(__filename)
        const sys = new Database({ url })
        await sys.login('root', rootPassword)
        const dbWithAView = await sys.createDatabase(name)
        await dbWithAView.createView('foo')

        try {
          const response = await searchView({
            connection: dbWithAView, // use roots connection
            name: 'foo',
          })

          expect(response.message).toEqual(false)
          expect(response.view.isArangoView).toEqual(true)
          expect(response.view.name).toEqual('foo')
        } finally {
          await sys.dropDatabase(name)
        }
      })
    })
  })
})
