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

The `makeDatabase` call returns a set of functions that allow you to query,
truncate and drop the database you just created.

Databases and collections that are asked for via `makeDatabase` will be created
if they don't already exist.

```javascript
const { ArangoTools } = require('arango-tools')

let { makeDatabase } = await ArangoTools({ rootPass, url })

let {query, truncate, drop, collections} = await makeDatabase({
  dbname: 'foo',
  user,
  password,
  documentCollections: ['widgets'],
})

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

Arango-tools also provides a helper function that generates a
database name from the current file which is helpful for tests:

```
var { dbNameFromFile } = require('arango-tools')

var response = await makeDatabase({
	dbname: dbNameFromFile(__filename),
	user: 'mike',
	password: 'secret',
	documentCollections: ['foos'],
})
```
## Issues

This library is very focused on smoothing out the process of using Arango as a
document store in a TDD workflow. Much of the other functionality of Arango
will still require ArangoJS to access. TODO:

* A way to create indexes
* Should this be running migrations a-la
  [arangomigo](https://github.com/deusdat/arangomigo)?
