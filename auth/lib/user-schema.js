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
  },

  // username used as foreign key in other apps
  system_name: {
    type: String
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


// set system name when saving
UserSchema.pre('save', function(next) {
  console.log('presave user:', this);
  
  if (! this.system_name) {
    console.log('new user needs system_name');

    var system_name = this.fb.name.full.replace(/ /g, '').toLowerCase().replace(/[^0-9a-z]/g, '');
    console.log("Stripped %s to %s", this.fb.name.full, system_name);

    // does this system name already exist? (unlikely but possible)
    // is there a cleaner way of running a query here?
    mongoose.model('User', UserSchema).find({ 'system_name': system_name }, function(err, matches) {
        if (matches.length) {
          system_name += this.fb.id;
          console.log('system name is already in use, appending user ID:', system_name);
        }

        this.system_name = system_name;
        next();
      });

  }
  
  next();
});

