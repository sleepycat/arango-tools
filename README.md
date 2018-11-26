# ArangoTools

ArangoJS describes itself as "The official ArangoDB low-level JavaScript
client". The "low-level" part never really meant much to me in my inital usage.
Over time I've been finding patterns in my own usage and accumulated
workarounds, which I kept telling myself I would extract into a library. This
is that library.

One of my primary painpoints is testing. Jest runs tests in parallel which
means that each test file needs it's own database. 

```javascript
let tools = await ArangoTools({ rootPass, url }).makeDatabase({
		dbname: 'foo',
		user,
		password,
		documentCollections: ['data'],
	})

let {db, {documents, edges}, drop} = tools
```

The `makeDatabase` call returns a database instance, as well as a function to
drop that database.
