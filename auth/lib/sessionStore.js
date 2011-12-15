/**
 * init a session store or pull from parent
 * assume app.db already exists
 * this module is loaded both by auth and HQ
 * @see similar db.js
 */

var _ = require('underscore');

module.exports = function(app, module, envt) {
  if (_.isUndefined(module.parent.sessionStore)) {
    var MongoStore = require('connect-mongodb');
    var sessionStore = new MongoStore({db: app.db.connection.db, reapInterval: 3000 });
    console.log('%s gets its own sessionStore', envt);
  }
  else {
    app.sessionStore = module.parent.sessionStore;
    console.log('%s gets parent sessionStore', envt);
  }

};
