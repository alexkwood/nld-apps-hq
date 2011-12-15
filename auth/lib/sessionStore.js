/**
 * init a session store or pull from parent
 * assume app.db already exists
 * this module is loaded both by auth and HQ
 * @see similar db.js
 */

var _ = require('underscore');

module.exports = function(app, parentApp, envt) {

  if (! _.isEmpty(parentApp)) {
    if (! _.isEmpty(parentApp.sessionStore)) {
      app.sessionStore = parentApp.sessionStore;
      console.log('%s taking parent sessionStore', envt);

      return;
    }
  }

  var MongoStore = require('connect-mongodb');
  app.sessionStore = new MongoStore({db: app.db.connection.db, reapInterval: 3000 });
  console.log('%s gets its own sessionStore', envt);

};
