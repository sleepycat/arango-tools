const deleteUser = async (sys, userName) => {
  try {
    let response = await sys.route(`/_api/user/${userName}`).delete()
    return response.body
  } catch (e) {
    throw new Error(`Trying to delete user ${userName} and failed: ${e}`)
  }
}

module.exports.deleteUser = deleteUser
