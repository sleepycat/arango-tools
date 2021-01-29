const grantAccess = async (sys, dbname, username, permission = 'rw') => {
  let permissions
  try {
    permissions = await sys
      .route(`/_api/user/${encodeURI(username)}/database/${encodeURI(dbname)}`)
      .put({ grant: permission })
  } catch (e) {
    throw new Error(`Failed to grant ${username} rights to ${dbname}: ${e}`)
  }

  return permissions.body
}

module.exports.grantAccess = grantAccess
