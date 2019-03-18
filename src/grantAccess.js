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

