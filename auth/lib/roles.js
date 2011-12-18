// roles

var _ = require('underscore');

var roles = module.exports.roles = {
  
  // put in permissions as doSomething: true
  // assumed false if not explicitly allowed
  user: {
    use_app_lists: true
  },

  admin: {
    // @todo put in 'all' perm?
    admin_users: true,
    use_app_lists: true
  }

};

var defaultRole = module.exports.defaultRole = 'user';

// given a role (key), check perm
var canRole = module.exports.canRole = function(role, doWhat) {
  try {
    if (! _.isUndefined(roles[role]))
      if (! _.isUndefined(roles[role][doWhat]))
        if (roles[role][doWhat] === true) {
          console.log('canRole %s CAN %s', role, doWhat);
          return true;
        }
    }
  catch(e) {
    console.error('error caught in canRole: ', e);
  }

  console.log('canRole %s CANNOT %s', role, doWhat);
  return false;
};

// given a modeled user, check perm
// put this in UserSchema instead, disable here.
/*var canUser = module.exports.canUser = function(user, doWhat) {
  try {
    if (canRole(user.role, doWhat) === true)
      return true;
  }
  catch(e) {}
  finally {
    return false;
  }
};*/
