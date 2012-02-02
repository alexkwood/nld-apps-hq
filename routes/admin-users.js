// setup route for user admin

// ==== USING SIMPLE TEMPLATES ====
module.exports = function(app) {

  var _ = require('underscore');
  
  // require('express-mongoose');   // - not using anymore
  var async = require('async');     // - using instead
  
  var User = app.db.model('User');
  
  
  // use different middleware depending on mode
/*  var adminUserRequireUser = function() {
    if (app.conf.localNoAuth && app.conf.localNoAuth === true) {
      return function(req, res, next) {
        console.log('** special exception for localNoAuth at admin/users');
        return next();
      };
    }
    else {
      return app.requireUserCan('admin_users');   // array of middleware
    }
  }();  */
  
  
  app.get('/admin/users',

    // use different middleware depending on mode
    function _specialMiddleware() {
      if (app.conf.localNoAuth && app.conf.localNoAuth === true) {
        return function(req, res, next) {
          console.log('** special exception for localNoAuth at admin/users');
          return next();
        };
      }
      return app.requireUserCan('admin_users');   // array of middleware
    }(),
    
    function(req, res) {      
      async.series([
        function(next) {
          User.getUsersExtended(function(error, users) {
            if (error) return res.end("[Error] " + error);     // @todo handle more gracefully
            
            res.local('users', users);
            next();
          });
        },
        
        function(next) {
          res.render('admin/users', {
            title: 'User Admin'
          });

          // next();   // unnecessary
        }
      ]);
    }
  );


  // for local test mode, without everyauth/FB
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

        // keep some session vars
        var redirectAfterLogin = (req.session && req.session.redirectAfterLogin) ? req.session.redirectAfterLogin : null;

        // start fresh session
        req.session.regenerate(function () {
          // hack in, not sure what else goes in 'auth' here
          req.session.auth = { userId: uid };  // picked up by loadUser()
          
          if (redirectAfterLogin) req.session.redirectAfterLogin = redirectAfterLogin;
          
          console.log('clean session w/ userId? ', req.session);
          return res.redirect('/');
        });
      }
      else {
        res.redirect('/admin/users');
      }
    }
  );
  

  /*
  // for schema changes
  app.get('/admin/users/resave', app.requireUserCan('admin_users'),
      function(req, res) {
        
        User.getUsers(function(error, users) {
          var countSaved = 0;
          
          users.forEach(function(user) {
            // console.log('saving user ', user._id);
            user.save();
            countSaved++;
          });

          console.log('re-saved ' + countSaved + ' users');
          req.flash('info', 'Re-saved ' + countSaved + ' users');

          res.redirect('/admin/users');
        });

      }
  );
  */
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
