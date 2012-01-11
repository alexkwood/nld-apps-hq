// user schema, with Mongoose

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Promise = mongoose.Promise
  , roles = require('./roles')
  , _ = require('underscore')
  , async = require('async');

// leave mostly bare, let MongooseAuth fill it in
// added: role

// mongoose-admin needs separate raw obj. @todo try to consolidate later (in mongoose-admin, try to pull raw from modeled)
var UserSchemaRaw = /*module.exports.UserSchemaRaw =*/ {
  role: {
    type: String,
    default: roles.defaultRole,
    index: true
  },

  joined: {
    type: Date,
    default: Date.now()
  },

  // username used as foreign key in other apps
  system_name: {
    type: String,
    index: true
  }
};

var UserSchema = module.exports.UserSchema = new Schema(UserSchemaRaw);


// check role/access on individual user
UserSchema.methods.canUser = function(doWhat) {
  var ret = roles.canRole(this.role, doWhat);
  console.log('can user %s? (role:%s) %d', doWhat, this.role, ret);
  return ret;
};

// get displayed username (FB Full Name)
// @todo convert this to a 'getter'?
UserSchema.methods.displayName = function() {
  try {
    if (!_.isUndefined(this.fb.name.full)) {
      return this.fb.name.full;
    }
  }
  catch(e) {}
  return null;
};


// for express-mongoose
UserSchema.statics.getUsers = function(callback) {
  var promise = new Promise;
  if (callback) promise.addBack(callback);

  this.find({}, promise.resolve.bind(promise));
  return promise;
};


// set system name when saving
// note: assuming the user has all the FB properties, not accounting for new & EMPTY system_name.
UserSchema.pre('save', function(next) {
  var user = this;
  console.log('presave user ', user._id);
  
  if (!_.isUndefined(user.system_name) && !_.isEmpty(user.system_name)) {
    console.log('user already has system name %s', user.system_name);
    next();
  }

  console.log('new user needs system_name');
  var system_name = '';

  // need a series for query.
  async.series([
    function(cb) {
      // use alias first
      if (!_.isEmpty(user.fb.alias)) {
        system_name = user.fb.alias;
        console.log("Using FB alias: %s", system_name);
      }
      else console.log('no fb.alias?', user.fb, user.fb.alias);
      cb();
    },
    
    function(cb) {
      if (_.isEmpty(system_name)) {
        system_name = user.fb.name.full.replace(/ /g, '').toLowerCase().replace(/[^0-9a-z]/g, '');
        console.log("Stripped %s to %s", user.fb.name.full, system_name);
      }
      cb()
    },
    
    function(cb) {
      // does this system name already exist? (unlikely but possible)
      // (is there a cleaner way of running a query here?)
      mongoose.model('User', UserSchema).find({ 'system_name': system_name }, function(err, matches) {
        if (! _.isEmpty(matches)) {
          system_name += user.fb.id;
          console.log('system name is already in use, appending user ID:', system_name);
        }
        else {
          console.log('system name %s is new', system_name);
        }
        cb();
      })
    },
    
    function(cb){
      user.system_name = system_name;
      // console.log('check new system_name:', user);

      next();
      cb();
    }
  ]); //series
  
  // [anything after this series will actually run BEFORE (or parallel to) series.]  
});

