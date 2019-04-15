# ArangoTools

[ArangoJS](https://github.com/arangodb/arangojs) describes itself as "The
official ArangoDB low-level JavaScript client". The "low-level" part never
really meant much to me in my inital usage.  Over time I've been finding
patterns in my own usage and accumulated workarounds, which I kept telling
myself I would extract into a library. This is that library.

## Installation

```sh
npm install arango-tools
```

## Usage

The `migrate` call takes a set of json documents describing the desired state
of the database, and returns a set of functions that allow you act on the
objects you just created.
Migrations are idempotent, and create resources only when the don't exist.

```javascript
const { ArangoTools, dbNameFromFile } = require('arango-tools')
let name = dbNameFromFile(__filename)

let { migrate } = await ArangoTools({ rootPass, url })

let {query, truncate, drop, collections} = await migrate([
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
])

await collections.widgets.save({foo: "bar"})

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

The current implementation is basic but works. Currently the only migrations
that work are creating a database and a document collection. Indexes, graphs
and edge collections will be added soon.

