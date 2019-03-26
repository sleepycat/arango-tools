const { Database, aql } = require('arangojs')
const { createCollections } = require('./createCollections')
const { createUser } = require('./createUser')
const { grantAccess } = require('./grantAccess')

const makeDatabase = async (
  sys,
  url,
  { dbname, user, password, documentCollections = [], edgeCollections = [] },
) => {
  if (user !== 'root') {
    try {
      await createUser(sys, { user, passwd: password })
      await grantAccess(sys, dbname, user)
    } catch (e) {
      // if the error is just a duplicate name thats ok. We'll just wrap it
      // up and return it.
      if (e.message !== 'duplicate name') {
        throw new Error(
          `Tried to grant "${user}" access to "${dbname}" and got: ${e}`,
        )
      }
    }
  }
  try {
    await sys.createDatabase(dbname, [{ user }])
  } catch (e) {
    // if the error is just a duplicate name thats ok. We'll just wrap it
    // up and return it.
    if (e.message !== 'duplicate name') {
      throw new Error(
        `Tried to create database called "${dbname}" and got: ${e}`,
      )
    }
  }

  let newdb
  try {
    newdb = new Database({ url })
    newdb.useDatabase(dbname)
    newdb.useBasicAuth(user, password)
  } catch (e) {}

  let documentCols = await createCollections(
    newdb,
    documentCollections,
    'document',
  )
  let edgeCols = await createCollections(newdb, edgeCollections, 'edge')

  return {
    query: (strings, ...vars) => newdb.query(aql(strings, ...vars)),
    collections: Object.assign({}, documentCols, edgeCols),
    drop: () => sys.dropDatabase(dbname),
    truncate: () => newdb.truncate(),
  }
}

module.exports.makeDatabase = makeDatabase
