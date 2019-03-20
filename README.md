# ArangoTools

ArangoJS describes itself as "The official ArangoDB low-level JavaScript
client". The "low-level" part never really meant much to me in my inital usage.
Over time I've been finding patterns in my own usage and accumulated
workarounds, which I kept telling myself I would extract into a library. This
is that library.

One of my primary painpoints is testing. Jest runs tests in parallel which
means that each test file needs it's own database.

```javascript
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

The `makeDatabase` call returns a set of functions that allow you to query, truncate and drop the database you just created.
