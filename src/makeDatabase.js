const { Database, aql } = require('arangojs')
const { createCollections } = require('./createCollections')
const { createUser } = require('./createUser')
const { grantAccess } = require('./grantAccess')

const makeDatabase = async (
  sys,
  rootPass,
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
    await sys.createDatabase(dbname)
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
    newdb.useBasicAuth('root', rootPass)
  } catch (e) {
    console.log('this blew up while creating newdb')
  }

  let documentCols = await createCollections(
    newdb,
    documentCollections,
    'document',
  )
  let edgeCols = await createCollections(newdb, edgeCollections, 'edge')

  let output = new Database({ url })
  output.useDatabase(dbname)
  output.useBasicAuth(user, password)

  return {
    query: (strings, ...vars) => output.query(aql(strings, ...vars)),
    collections: Object.assign({}, documentCols, edgeCols),
    drop: () => sys.dropDatabase(dbname),
    truncate: () => output.truncate(),
  }
}

module.exports.makeDatabase = makeDatabase
