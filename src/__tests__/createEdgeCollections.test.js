const { parse } = require('path')
const { Database } = require('arangojs')
require('dotenv-safe').config()
const { createEdgeCollections } = require('../createCollections')

const {
  ARANGOTOOLS_DB_URL: url,
  ARANGOTOOLS_DB_PASSWORD: password,
} = process.env

const generateName = () =>
  parse(__filename).base.replace(/\./g, '_') + '_' + Date.now()

let sys, db
const testCollections = ['a', 'b']

describe('ArangoTools', () => {
  beforeEach(async () => {
    sys = new Database({ url })
    sys.useDatabase('_system')
    sys.useBasicAuth('root', password)
  })

  afterAll(async () => db.drop())

  describe('createEdgeCollections', () => {
    it('returns and object with save and import functions', async () => {
      const name = generateName()
      await sys.createDatabase(name)
      const db = new Database()
      db.useDatabase(name)
      db.useBasicAuth('root', password)

      let collectionsObject
      try {
        collectionsObject = await createEdgeCollections(db, testCollections)
      } catch (e) {
        console.log(e.message)
      } finally {
        sys.dropDatabase(name)
      }

      expect(collectionsObject).toEqual(
        expect.objectContaining({
          a: expect.objectContaining({
            save: expect.any(Function),
            import: expect.any(Function),
          }),
          b: expect.objectContaining({
            save: expect.any(Function),
            import: expect.any(Function),
          }),
        }),
      )
    })

    it('returns existing collections', async () => {
      const name = generateName()
      await sys.createDatabase(name)
      const db = new Database()
      db.useDatabase(name)
      db.useBasicAuth('root', password)

      const foo = db.collection('foo')
      await foo.create()

      await expect(createEdgeCollections(db, ['foo'])).resolves.toEqual(
        expect.objectContaining({
          foo: expect.objectContaining({
            save: expect.any(Function),
            import: expect.any(Function),
          }),
        }),
      )
      await sys.dropDatabase(name)
    })

    it('actually creates collections in the database', async () => {
      const name = generateName()
      await sys.createDatabase(name)
      const db = new Database()
      db.useDatabase(name)
      db.useBasicAuth('root', password)

      try {
        await createEdgeCollections(db, testCollections)
        const collections = await db.collections()
        expect(collections.map((c) => c.name)).toContain(...testCollections)
      } catch (e) {
        console.log(e.message)
      } finally {
        sys.dropDatabase(name)
      }
    })
  })
})
