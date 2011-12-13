// LoginToken model

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  //, ObjectId = Schema.ObjectId
  //, crypto = require('crypto')
  ;


var LoginToken = new Schema({
  userid: { type: String, index: true },
  series: { type: String, index: true },
  token: { type: String, index: true }
});


LoginToken.method('randomToken', function() {
  var token = Math.round( (new Date().valueOf() * Math.random()) ).toString();
  console.log('random login token: ', token);
  return token;
});

LoginToken.pre('save', function(next) {
  this.token = this.randomToken();

  if (this.isNew) this.series = this.randomToken();  // what is this for?

  next();
});

// virtuals only exist in object, not saved to DB
LoginToken.virtual('id').get(function() { return this._id.toHexString(); });

LoginToken.virtual('cookieValue').get(function() {
  return JSON.stringify({ userid: this.userid, token: this.token, series: this.series });
});

module.exports.LoginToken = mongoose.model('LoginToken', LoginToken);
