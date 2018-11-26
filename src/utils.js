const { Database } = require('arangojs')
const { parse } = require('path')

const getFilenameFromPath = path => parse(path).base

module.exports.getFilenameFromPath = getFilenameFromPath

const dbNameFromFile = filename =>
  getFilenameFromPath(filename).replace(/\./g, '_') + '_' + Date.now()

module.exports.dbNameFromFile = dbNameFromFile

const createUser = async (sys, credentials) => {
  try {
    let allUsers = await sys.route('/_api/user').get()

    let names = allUsers.body.result.filter(u => u.user === credentials.user)
    if (names.length === 0) {
      let response = await sys.route('/_api/user').post(credentials)
      let { user, active, extra } = response.body
      return { user, active, extra }
    } else {
      return names[0]
    }
  } catch (e) {
    throw new Error(`Trying to create a user and failed: ${e}`)
  }
}

module.exports.createUser = createUser

const createCollections = (db, collections, collectionType = 'document') => {
  return Promise.all(
    collections.map(async c => {
      // Make a collection instance to put stuff in.
      let col
      if (collectionType === 'edge') {
        col = db.edgeCollection(c)
      } else {
        col = db.collection(c)
      }
      // Make sure the instance has a real collection backing it.
      try {
        await col.create()
      } catch (e) {
        console.log(`col create blew up: ${e.message}`, col)
      }
      return col
    }),
  )
}
module.exports.createCollections = createCollections

const grantAccess = async (sys, dbname, username) => {
  let permissions
  try {
    permissions = await sys
      .route(`/_api/user/${username}/database/${dbname}`)
      .put({ grant: 'rw' })
  } catch (e) {
    throw new Error(`Failed to grant ${username} rights to ${dbname}: ${e}`)
  }

  return permissions.body
}

module.exports.grantAccess = grantAccess

function ArangoTools({ rootPass, url }) {
  let sys = new Database({ url })
  sys.useDatabase('_system')
  sys.useBasicAuth('root', rootPass)

  return {
    makeDatabase: async ({
      dbname,
      user = 'root',
      password = 'test',
      documentCollections = [],
      edgeCollections = [],
    }) => {
      if (user !== 'root') {
        try {
          await createUser(sys, { user, passwd: password })
          await sys.createDatabase(dbname, [{ user }])
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
      } else {
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
      }

      let newdb
      try {
        newdb = new Database({ url })
        newdb.useDatabase(dbname)
        newdb.useBasicAuth('root', 'test')
      } catch (e) {
        console.log(`creating newdb failed: ${e}`)
      }

      let documentCols = await createCollections(
        newdb,
        documentCollections,
        'document',
      )
      let edgeCols = await createCollections(newdb, edgeCollections, 'edge')

      // Return the db, collections and functions to drop and truncate it.
      return {
        db: newdb,
        collections: { documents: documentCols, edges: edgeCols },
        drop: () => sys.dropDatabase(dbname),
        truncate: () => newdb.truncate(),
      }
    },
  }
}

module.exports.ArangoTools = ArangoTools
