// users are stored in DB via Mongoose

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  //, ObjectId = Schema.ObjectId
  ;


// leave bare, let MongooseAuth fill it in
var UserSchema = module.exports.UserSchema = new Schema({

  // demo has this
  // @todo remove after confirming not necessary
  role: {type: String, default: 'free'}

});

// wrap in modeling stuff
// does the model itself need to be exported for anything?
//var User = module.exports.User = mongoose.model('User', User);
// moved mongoose.model() to app.js

// impt: 'user.my' syntax from docs doesn't work anymore!

/*
module.exports.addUser = function(userObj, callback) {
  var user = new User(userObj);
  // run save() on individual user, not model User !
  user.save(callback);
};
*/

/*
module.exports.findUser = function(criteria, callback) {
  User.find(criteria, callback);
};
*/
