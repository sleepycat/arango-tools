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

The collection properties `writeConcern`, `replicationFactor`, `schema` and `waitForSync` are mutable, and will be updated if you change the options passed to `documentcollection` and `edgecollection` objects.

```javascript
// new simplified API! 😀
const { ensure } = require('arango-tools')

let { query, truncate, drop, transaction, collections } = await ensure({
  variables: { username: 'mike', password: 'test', rootPassword: 'secret' },
  schema: {
    type: 'database',
    name: 'myapp',
    url: 'http://localhost:8529', // default
    rootPassword: '{{rootPassword}}', // optional when the database exists!
    options: [
      { type: 'user', username: '{{username}}', password: '{{password}}' },
      {
        type: 'documentcollection',
        name: 'people',
        options: {
          schema: {
            rule: {
              properties: {
                nums: { type: 'array', items: { type: 'number', maximum: 6 } },
              },
              additionalProperties: { type: 'string' },
              required: ['nums'],
            },
            level: 'moderate',
            message:
              "The document does not contain an array of numbers in attribute 'nums', or one of the numbers is bigger than 6.",
          },
          waitForSync: false,
        },
      },
      {
        type: 'edgecollection',
        name: 'likes',
        options: { journalSize: 10485760, waitForSync: true },
      },
      {
        type: 'delimiteranalyzer',
        name: 'my-delimiter-analyzer',
        delimiter: ';',
      },
      {
        type: 'searchview',
        name: 'placeview',
        options: {
          links: {
            places: {
              fields: {
                name: { analyzers: ['text_en', 'my-delimiter-analyzer'] },
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
  },
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
    options: { journalSize: 10485760, waitForSync: true },
  },
  {
    type: 'delimiteranalyzer',
    databaseName: name,
    name: 'my-delimiter-analyzer',
    delimiter: ';',
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

For those moments when you really just want to connect, there is also `connectTo`.

```javascript
const { query, drop, truncate, transaction } = await connectTo({
  url: 'http://localhost:8529', // default
  databaseName: 'mydb',
  as: {
    username: 'mike', // the user the returned funtions should operate with
    password: 'secret',
  },
})
```

## Issues

Currently arango-tools can create a database, a document/edge collection, a search view, delimiter analyzer and a GeoIndex.
Other types and graphs will be added soon.

Analyzers can't be updated in ArangoDB. The closest equivalent is deleting one and replacing it with a new one of the same name. That's the strategy currently for the `delimiteranalyzer`, but it's possible that could cause issues with queries actively using the analyzer at the moment it's replaced.

The `replicationFactor` collection property is only available when ArangoDB is running in cluster mode. If arango-tools is talking to a cluster, it will create/update that property. If it's talking to a single database, it will just ignore `replicationFactor`. Not being too pedantic means a more consistent experience across environments.
