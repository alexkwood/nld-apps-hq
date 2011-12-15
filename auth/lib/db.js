/**
 * load a DB connection of pull from parent
 * this module is loaded both by auth and HQ
 */

var mongoose = require('mongoose')
  , _ = require('underscore');

// (envt is just for logging)
// @todo can module.parent be pulled straight from app?
module.exports = function(app, module, envt) {

  // (only connect to db if no parent connection)
  if (_.isUndefined(module.parent.db)) {
    // 1 global DB connection.
    // (we need the db for the session store)
    app.db = mongoose.connect('mongodb://' + app.conf.dbHost + '/' + app.conf.dbName);
    console.log('%s gets its own DB connection', envt);
  }
  else {
    app.db = module.parent.db;
    console.log('%s taking parent connection', envt);
  }

};
