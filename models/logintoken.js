// LoginToken model
// ** SOMETHING IS WRONG HERE, NONE GETTING SAVED!!
// IMPT: don't return a model, just the schema, let app.js wrap in model.

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  //, ObjectId = Schema.ObjectId
  //, crypto = require('crypto')
  ;


var LoginTokenSchema = new Schema({
  userid: { type: String, index: true },
  series: { type: String, index: true },
  token: { type: String, index: true }
});


LoginTokenSchema.method('randomToken', function() {
  var token = Math.round( (new Date().valueOf() * Math.random()) ).toString();
  console.log('random login token: ', token);
  return token;
});

LoginTokenSchema.pre('save', function(next) {
  console.log('pre-saving a LoginToken', this);
  this.token = this.randomToken();

  if (this.isNew) this.series = this.randomToken();  // what is this for?

  next();
});

// virtuals only exist in object, not saved to DB
LoginTokenSchema.virtual('id').get(function() {
  console.log('requested virtual ID for LoginToken');
  return this._id.toHexString();
});

LoginTokenSchema.virtual('cookieValue').get(function() {
  console.log('requested cookieValue from LoginToken');
  return JSON.stringify({ userid: this.userid, token: this.token, series: this.series });
});

// moved modeling to app.js
module.exports.LoginTokenSchema = LoginTokenSchema;   // (does it matter if this is here or above?)
//module.exports.LoginToken = mongoose.model('LoginToken', LoginToken);
