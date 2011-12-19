// user schema, with Mongoose

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Promise = mongoose.Promise
  , roles = require('./roles')
  , _ = require('underscore')

// leave mostly bare, let MongooseAuth fill it in
// added: role

// mongoose-admin needs separate raw obj. @todo try to consolidate later (in mongoose-admin, try to pull raw from modeled)
var UserSchemaRaw = /*module.exports.UserSchemaRaw =*/ {
  role: {
    type: String,
    default: roles.defaultRole
  },

  joined: {
    type: Date,
    default: Date.now()
  }
};

var UserSchema = module.exports.UserSchema = new Schema(UserSchemaRaw);


// check role/access on individual user
UserSchema.methods.canUser = function(doWhat) {
  var ret = roles.canRole(this.role, doWhat);
  console.log('can user %s? (role:%s) %d', doWhat, this.role, ret);
  return ret;
};


// for express-mongoose
UserSchema.statics.getUsers = function(callback) {
  var promise = new Promise;
  if (callback) promise.addBack(callback);

  this.find({}, promise.resolve.bind(promise));
  return promise;
};


