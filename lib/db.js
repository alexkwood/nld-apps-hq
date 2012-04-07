/**
 * load a DB connection of pull from parent
 * this module is loaded both by auth and HQ
 */

var mongoose = require('mongoose')
  , _ = require('underscore');

module.exports = function(app, parentApp, connectCallback) {
  
  // (only connect to db if no parent connection)
  if (! _.isEmpty(parentApp)) {
    if (! _.isEmpty(parentApp.db)) {
      app.db = parentApp.db;
      console.log('%s taking parent connection', app.name); 
      return connectCallback(null);
    }
  }

  // 1 global DB connection.
  // (we need the db for the session store)
  app.db = mongoose.connect('mongodb://' + app.conf.dbHost + '/' + app.conf.dbName);

  console.log('%s gets its own DB connection', app.name);
  
  // IMPT: this was causing a race condition w/ connect-mongodb, where it tried to run .remove() before connection opened.
  // resolved by passing this a callback, rest of app waiting til it loads.
  // but make sure it takes no longer than 5 seconds.
  var timeout = setTimeout(function(){
    connectCallback(new Error("DB failed to open in 5 seconds!"));
  },
  5000);

  mongoose.connection.on('open', function(){
    clearTimeout(timeout);
    console.log('DB connection opened');
    
    if (typeof connectCallback !== 'function') {
      console.error('WTF did connectCallback go?');
      process.exit();
      return;
    }
    connectCallback(null);
  });
};
