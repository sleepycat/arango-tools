const { connect } = require('./connect')
const { databaseAccessors } = require('./databaseAccessors')

async function connectTo(options) {
  const { connection, message } = await connect(options)
  if (message) throw new Error(message)
  return databaseAccessors({ connection })
}

module.exports.connectTo = connectTo
