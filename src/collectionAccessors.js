function collectionAccessors({ collection }) {
  return {
    [collection.name]: {
      save: (doc, opts) => collection.save(doc, opts),
      import: (array, opts) => collection.import(array, opts),
    },
  }
}

module.exports.collectionAccessors = collectionAccessors
