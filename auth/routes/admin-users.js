// setup route for user admin
//
// problem here: mongoose-admin recreates the User model, but w/o all the everyauth wrapping. (so it's not very useful.)
// @todo need to figure out how to pull the raw 'fields' from the model. (then we don't need UserSchemaRaw anymore.)
// then pass the model in from parent app, after wrapped.

module.exports = function(app, UserSchema) {

  console.log('tree? ' , UserSchema.tree);

  var mongoose = require('mongoose')
    , mongooseAdmin = require('mongoose-admin')   // docs @ http://www.mongoose-admin.com. FORKED AND HEAVILY MODIFIED!

    //, UserSchemaRaw = require(app.appRoot + '/lib/user-schema').UserSchemaRaw

//console.log('raw:', UserSchemaRaw);

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

  // this requires RAW schema - jumping thru hoops here!!
  userAdmin.registerModel('User', UserSchema, {
        list: ['_id', 'role', /*'fb.id', 'fb.name',*/ 'joined'],  // fb.* fields don't work
        sort: ['role']
      });
  

};

