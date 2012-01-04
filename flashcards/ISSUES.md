# A log of issues encountered as I build this app.

* trouble w/ 'block' and nested templates. Seem to have figured out.

* Can the same URL handle POST and GET or do they have to be separate URLs?
  - yes, just get() and post() the same path.
* but what's the best way to handle the same form with or without POSTed data?

* use Step for logic flow? https://github.com/creationix/step

* forms module breaks when bodyParser is used.

* put model class in models/word.js, but it doesn't have access to libraries called in app.js

* 'this' var in object gets lost/unbound as callbacks get deeper

* forms plugin -- after submitted, want to show form again but EMPTY; shows submitted values. how to reset?

* how to catch un-handled paths w/o crash? [is try-catch enough?]

* what's the proper way to set global app variables that get inherited by exported modules?
  - or is there something better than require() for sub-files?

* what's the best way to pass an _id for editing? hidden field seems clunky.

* on mongodb save/update, update() returns no result in callback, is it safe to assume success?

* when same path needs exact same handling for get and post, how to avoid duplicating??

## todo

* replace less.js with compiler plugin in Connect: http://senchalabs.github.com/connect/middleware-compiler.html

* on remove(), how to handle both ObjectID and other ID types?

* convert callback() calls to `return callback()` to eliminate else{}

----

* debug app according to http://docs.nodejitsu.com/articles/getting-started/how-to-debug-nodejs-applications

* check out: 
    `var Args = require("vargs").Constructor;

    example = function () {
      var args = new Args(arguments);
      args.callback.apply({},args.all);
    }`

* check out: `var obj = { get a() { return "something" }, set a() { "do nothing" } } getter/setter syntax`

* use `Object.create(proto, props)` instead of _.extend() for constructor?

* "All object properties should always be double quoted" (nodejitsu) - why?

* where/when should the db handler be created? if at start of module, has no response object to pass errors to!
  -- solved w/ connectDb middleware before each request.
* single DB connection for app, or for each request? mongo-connect (session store) seems to want an app-wide connection.

