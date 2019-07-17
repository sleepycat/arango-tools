const { parse } = require('path')
const { Database } = require('arangojs')
require('dotenv-safe').config()
const { createDocumentCollections } = require('../createCollections')

const { ARANGOTOOLS_DB_PASSWORD: password } = process.env

const generateName = () =>
  parse(__filename).base.replace(/\./g, '_') + '_' + Date.now()

let sys
let testCollections = ['a', 'b']

describe('ArangoTools', () => {
  beforeEach(async () => {
    sys = new Database()
    sys.useDatabase('_system')
    sys.useBasicAuth('root', password)
  })

  describe('createDocumentCollections', () => {
    it('actually creates collections in the database', async () => {
      let name = generateName()
      await sys.createDatabase(name)
      let db = new Database()
      db.useDatabase(name)
      db.useBasicAuth('root', password)

      await createDocumentCollections(db, testCollections)

      let collections = await db.collections()
      sys.dropDatabase(name)

      expect(collections.map(c => c.name)).toContain(...testCollections)
    })

    it('returns existing collections', async () => {
      let name = generateName()
      await sys.createDatabase(name)
      let db = new Database()
      db.useDatabase(name)
      db.useBasicAuth('root', password)

      let foo = db.collection('foo')
      await foo.create()

      await expect(createDocumentCollections(db, ['foo'])).resolves.toEqual(
        expect.objectContaining({
          foo: expect.objectContaining({
            save: expect.any(Function),
            import: expect.any(Function),
          }),
        }),
      )
      await sys.dropDatabase(name)
    })

    it('returns an object with save and import functions', async () => {
      let name = generateName()
      await sys.createDatabase(name)
      let db = new Database()
      db.useDatabase(name)
      db.useBasicAuth('root', password)

      let collectionsObject = await createDocumentCollections(
        db,
        testCollections,
      )

      sys.dropDatabase(name)

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
  })
})
