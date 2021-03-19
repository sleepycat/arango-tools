async function createDelimiterAnalyzer({ connection, name, delimiter }) {
  let analyzer = connection.analyzer(name)
  // create it and return it!
  try {
    analyzer = await connection.createAnalyzer(name, {
      type: 'delimiter',
      properties: { delimiter },
    })
    return { analyzer, message: false }
  } catch (e) {
    if (e.message.match(/insufficient rights/i)) {
      return {
        analyzer: false,
        message: `Insufficient user permissions to create analyzer in "${connection.name}".`,
      }
    }
  }
}

async function delimiterAnalyzer({ connection, name, delimiter }) {
  const analyzer = connection.analyzer(name)
  const exists = await analyzer.exists()
  if (exists) {
    // correct?
    const description = await analyzer.get()

    if (description.properties.delimiter === delimiter) {
      return { analyzer, message: false }
    } else {
      // drop and recreate
      await analyzer.drop()
      return createDelimiterAnalyzer({ connection, name, delimiter })
    }
  } else {
    // create it and return it!
    return createDelimiterAnalyzer({ connection, name, delimiter })
  }
}

module.exports.delimiterAnalyzer = delimiterAnalyzer
