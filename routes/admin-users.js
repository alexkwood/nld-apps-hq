// setup route for user admin

// ==== USING SIMPLE TEMPLATES ====
module.exports = function(app) {

  //var mongoose = require('mongoose');

  require('express-mongoose');
  
  //console.log('model in db?', app.db.model('User'));
  var User = app.db.model('User');
  //console.log('model in mongoose?', mongoose.model('User'));
  //var User = mongoose.model('User', app.UserSchema);
  //console.log('modeled:', User);

  app.get('/admin/users', app.loadUser, app.requireUserCan('admin_users'),
      function(req, res) {
        res.render('admin/users', {
          title: 'User Admin',
          users: User.getUsers()
        });
      }
  );
};

/*
// === USING MONGOOSE-ADMIN (doesn't work very well, and very complex) ===
// problem here: mongoose-admin recreates the User model, but w/o all the everyauth wrapping. (so it's not very useful.)
// @todo need to figure out how to pull the raw 'fields' from the model. (then we don't need UserSchemaRaw anymore.)
// then pass the model in from parent app, after wrapped.

module.exports = function(app) {

  var mongoose = require('mongoose')
    , mongooseAdmin = require('mongoose-admin')   // docs @ http://www.mongoose-admin.com. FORKED AND HEAVILY MODIFIED!

  //var UserSchemaRaw = require(app.appRoot + '/lib/user-schema').UserSchemaRaw
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
  userAdmin.registerModel('User', app.UserSchema, {
        list: ['_id', 'role', 'joined'],  // fb.* fields don't work
        sort: ['role']
      });
  

};
*/
