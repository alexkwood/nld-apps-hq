// users are stored in DB via Mongoose

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  ;

var UserSchema = module.exports.UserSchema = new Schema({
  /*
  userId: ObjectId,
  remoteUserId: String,
  method: String,  // @todo restrict to known connect types ('facebook' for now)
  signupDate: { type: Date, default:Date.now },
  lastLogin: Date,
  displayName: String,
  fbMeta: {}   //Object  // ?
  */
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
