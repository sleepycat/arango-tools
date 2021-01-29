const { Database } = require('arangojs')

async function connect({
  as: { username, password } = { username: false, password: false },
  databaseName,
  rootPassword,
  url = 'http://localhost:8529',
}) {
  const conn = new Database({ url, databaseName })
  // TODO clean this up. There is WAY to much nested logic and repetition
  if (username && password) {
    try {
      await conn.login(username, password)
    } catch (e) {
      // login as user failed

      if (e.message === 'Wrong credentials') {
        return {
          connection: false,
          message: 'bad credentials',
        }
      }
      if (e.message === 'forbidden') {
        // doesn't exist
        // if we have rootPass just create it
        if (rootPassword) {
          const sys = new Database({ url, databaseName: '_system' })
          await sys.login('root', rootPassword)

          const newdb = await sys.createDatabase(databaseName, {
            users: [
              {
                username,
                passwd: password,
                active: true,
              },
            ],
          })

          await newdb.login(username, password)

          return {
            connection: newdb,
            message: false,
          }
        } else {
          return {
            connection: false,
            message: 'no such database',
          }
        }
      }
      if (e.message.match(/getaddrinfo ENOTFOUND/)) {
        return {
          connection: false,
          message: 'database server is not reachable',
        }
      }
      // in case anything changes
      return {
        connection: false,
        message: e.message,
      }
    }
    // db existed, user logged in
    return {
      connection: conn,
      message: false,
    }
  } else {
    // username && password false.
    try {
      await conn.login('root', rootPassword)
    } catch (e) {
      if (e.message.match(/getaddrinfo ENOTFOUND/)) {
        return {
          connection: false,
          message: 'database server is not reachable',
        }
      }
      if (e.message === 'Wrong credentials') {
        return {
          connection: false,
          message: 'bad credentials',
        }
      }
    }
    return {
      connection: conn,
      message: false,
    }
  }
}

module.exports.connect = connect
