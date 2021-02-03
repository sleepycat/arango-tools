# ArangoTools

The goal of of this library is to provide a declarative set of
[invariants](https://softwareengineering.stackexchange.com/a/32755/153496) at
the database level.

Influenced by the great [DX](https://bit.ly/2YomoYC) of MongoDB, and the
declarative model, wherever permissions allow arango-tools will create
resources you've said should exist. Both the `ensure` and `migrate` functions
are idempotent, and create resources only when they don't exist.

Basically, you should be able to state your intent and know when it couldn't
happen. Think [dotenv-safe](https://www.npmjs.com/package/dotenv-safe), but for
database stuff.

## Installation

```sh
npm install arango-tools
```

## Usage

The `ensure` function takes an object describing the desired state of the
database; your invariants, the collections and whatnot that must exist for your
program to run. When invariants hold, you're passed a set of accessor functions
that allow you to interact with the database. When they do not, a descriptive
error is raised.

```javascript
// new simplified API! 😀
const { ensure } = require('arango-tools')

let { query, truncate, drop, transaction, collections } = await ensure({
  type: 'database',
  name: 'myapp',
  url: 'http://localhost:8529', // default
  rootPassword: 'secret', // optional when the database exists!
  options: [
    { type: 'user', username: 'mike', password: 'test' },
    {
      type: 'documentcollection',
      name: 'people',
      options: { journalsize: 10485760, waitforsync: true },
    },
    {
      type: 'edgecollection',
      name: 'likes',
      options: { journalsize: 10485760, waitforsync: true },
    },
    {
      type: 'searchview',
      name: 'placeview',
      options: {
        links: {
          places: {
            fields: {
              name: { analyzers: ['text_en'] },
              description: { analyzers: ['text_en'] },
            },
          },
        },
      },
    },
    {
      type: 'geoindex',
      on: 'places',
      fields: ['lat', 'lng'],
      geoJson: true,
    },
  ],
})

// Old deprecated API 🙁
// Will be removed in 1.0
const { ArangoTools, dbNameFromFile } = require('arango-tools')
let name = dbNameFromFile(__filename)

let { migrate } = await ArangoTools({ rootPass, url })

let { query, truncate, drop, transaction, collections } = await migrate([
  {
    type: 'database',
    databaseName: name,
    users: [{ username: 'mike', passwd: 'sekret' }],
  },
  {
    type: 'documentcollection',
    databaseName: name,
    name: 'widgets',
    options: { journalsize: 10485760, waitforsync: true },
  },
  {
    type: 'searchview',
    databaseName: name,
    name: 'myview',
    options: {},
  },
  {
    type: 'geoindex',
    databaseName: name,
    collection: 'places',
    options: {
      fields: ['pts'],
      geoJson: true,
    },
  },
])

await collections.widgets.save({ foo: 'bar' })

let cursor = await query`
FOR widget IN widgets
  FILTER widget.foo === "bar"
  RETURN widget
`

await cursor.all()
// [{foo: "bar"}]

await drop()
```

## Issues

Currently arango-tools can create a database, a document/edge collection, a search view and a GeoIndex.
Other types and graphs will be added soon.
