// setup route for user admin

module.exports = function(app) {

  var mongoose = require('mongoose')
    , mongooseAdmin = require('mongoose-admin')   // docs @ http://www.mongoose-admin.com. FORKED AND HEAVILY MODIFIED!
    , UserSchema = require(app.appRoot + '/lib/user-schema')

  var userAdmin = mongooseAdmin.createAdmin(app.db, 
      {
        app: app,

        middleware: [
          app.loadUser,
          app.requireUserCan('admin_users')
        ],
        
        root: 'admin/users'   // leading slash gets added

      }
  );

  userAdmin.registerModel('User', UserSchema, { });
  

};

