// setup route for user admin

// ==== USING SIMPLE TEMPLATES ====
module.exports = function(app) {

  //var mongoose = require('mongoose');

  var _ = require('underscore');
  
  require('express-mongoose');
  
  //console.log('model in db?', app.db.model('User'));
  var User = app.db.model('User');
  //console.log('model in mongoose?', mongoose.model('User'));
  //var User = mongoose.model('User', app.UserSchema);
  //console.log('modeled:', User);

  app.get('/admin/users', app.requireUserCan('admin_users'),
      function(req, res) {
        res.render('admin/users', {
          title: 'User Admin',
          users: User.getUsers()
        });
      }
  );

  ///////  
  app.get('/admin/users/loginas/:loginas_uid?',
    function inLocalTestMode(req, res, next) {
      if (app.conf.localNoAuth) return next();
      else res.redirect('/admin/users');
    },
    
    function(req, res) {
      
      // login as user?
      // (was in app.param but want to validate auth first!)
      var uid = req.param('loginas_uid');
      if (!_.isEmpty(uid)) {
        console.log('requested to login as:', uid);

        // start fresh session
        req.session.regenerate(function () {
          // hack in, not sure what else goes in 'auth' here
          req.session.auth = { userId: uid };  // picked up by loadUser()
          console.log('clean session w/ userId? ', req.session);
          return res.redirect('/');     
        });
      }
      
      // same page as admin/users, w/ toggles in view
      res.render('admin/users', {
        title: 'Login As User',
        users: User.getUsers()
      });
    }
  );
  ///////
  

  // for schema changes
  app.get('/admin/users/resave', app.requireUserCan('admin_users'),
      function(req, res) {
        User.getUsers(function(err, users) {
          var countSaved = 0;
          
          users.forEach(function(user) {
            console.log('saving user ', user._id);
            user.save();
            countSaved++;
          });

          console.log('re-saved ' + countSaved + ' users');
          req.flash('info', 'Re-saved ' + countSaved + ' users');

          res.redirect('/admin/users');
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
          //app.loadUser,
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
