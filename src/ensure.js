const { Database } = require('arangojs')
const { connect } = require('./connect')
const { collection: createCollection } = require('./collection')
const { databaseAccessors } = require('./databaseAccessors')
const { collectionAccessors } = require('./collectionAccessors')
const { geoIndex } = require('./geoIndex')
const { searchView } = require('./searchView')

async function ensure(
  database = { url: 'http://localhost:8529', options: [] },
) {
  // output object we'll add to.
  const users = database.options.filter((opt) => opt.type === 'user')
  if (users.length > 1)
    throw new Error(
      `Arango-tools can't handle more than one user at the moment.`,
    )
  const [user] = users

  const { connection, message } = await connect({
    as: {
      username: user.username,
      password: user.password,
    },
    databaseName: database.name ?? '_system',
    rootPassword: database.rootPassword,
    url: database.url,
  })

  if (!connection) throw new Error(message)

  let rootConnection
  if (database.rootPassword) {
    rootConnection = new Database({ url: database.url })
    rootConnection.login('root', database.rootPassword)
  }

  let accessors = databaseAccessors({
    connection,
    rootConnection,
  })

  for (const option of database.options) {
    switch (option.type) {
      case 'user':
        // skip: this is handled above
        break
      case 'documentcollection': {
        const { collection, message } = await createCollection({
          connection,
          name: option.name,
          options: option.options,
        })
        if (!collection) throw new Error(message)

        accessors = Object.assign({}, accessors, {
          collections: {
            ...accessors.collections,
            ...collectionAccessors({ collection }),
          },
        })

        break
      }
      case 'edgecollection': {
        const { collection, message } = await createCollection({
          connection,
          name: option.name,
          options: option.options,
          type: 'edge',
        })
        if (!collection) throw new Error(message)

        accessors = Object.assign({}, accessors, {
          collections: {
            ...accessors.collections,
            ...collectionAccessors({ collection }),
          },
        })

        break
      }
      case 'geoindex': {
        await geoIndex({ connection, ...option })
        break
      }
      case 'searchview': {
        const { message } = await searchView({
          connection,
          name: option.name,
          options: option.options,
        })
        if (message) throw new Error(message)
        break
      }
      default:
        console.log('Not implemented yet: ', option)
    }
  }
  return accessors
}

module.exports.ensure = ensure
