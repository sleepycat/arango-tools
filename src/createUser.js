const listUsers = async sys => {
  let { body: allUsers } = await sys.route('/_api/user').get()
  return allUsers.result
}

module.exports.listUsers = listUsers

const createUser = async (sys, credentials) => {
  let users = await listUsers(sys)
  let names = users.filter(u => u.user === credentials.user)
  if (names.length >= 1) {
    // user exists
    return names[0]
  } else {
    try {
      let response = await sys.route('/_api/user').post(credentials)
      let { user, active, extra } = response.body
      return { user, active, extra }
    } catch (e) {
      throw new Error(`Trying to create a user and failed: ${e}`)
    }
  }
}

module.exports.createUser = createUser

