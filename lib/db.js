// create a global DB connection
//

var mongoose = require('mongoose');

// get settings from app, return global connection
module.exports = function(app) {
  return mongoose.connect('mongodb://' + app.conf.dbHost + '/' + app.conf.dbName);
}
