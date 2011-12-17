// user schema, with Mongoose

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , roles = require('./roles')
  , _ = require('underscore')

// leave mostly bare, let MongooseAuth fill it in
// added: role
var UserSchema = module.exports = new Schema({
  role: {
    type: String,
    default: roles.defaultRole
  }
});


// check role/access on individual user
UserSchema.methods.canUser = function(doWhat) {
  var ret = roles.canRole(this.role, doWhat);
  console.log('can user %s? %d', doWhat, ret);
  return ret;
};
