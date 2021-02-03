module.exports.searchView = async function searchView({
  connection,
  name,
  options = {},
}) {
  let view
  try {
    view = await connection.createView(name, options)
  } catch (e) {
    if (e.message.match(/duplicate/)) {
      return { view: connection.view(name), message: false }
    } else {
      return { view: false, message: e.message }
    }
  }
  // the ArangoSearch View "potatoes" now exists
  return { view, message: false }
}
