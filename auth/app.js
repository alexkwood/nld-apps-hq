/*
 * todo:
 * - boilerplate has nice GET output in console, do the same here
 * - refactor code to be cleaner
 * - use express 'basepath' config for sub-apps
 * - add flash messages?
 * 
 * IMPT: once a user is logged in, if they de-authorize the app in FB, they're still logged in!
 *  -- the whole LoginToken mess might have mitigated that, but not worth the complexity.
 *
 */

var express = require('express')
  //, routes = require('./routes')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , mongooseAuth = require('mongoose-auth')
  , everyauth = require('everyauth')
  , _ = require('underscore')
  ;

var app = module.exports = express.createServer();

// name for logging/scope checking
app.name = 'Auth';


// == this doesn't work ?? ==
//var parentApp = null;
// callback when this app is mounted as a sub-app
app.mounted(function(parent){
  // parent is parent app
  // "this" is auth
  console.log('mounted! setting parentApp');
  //parentApp = parent;
});

// is there a better way to do this??
// how do we know the parent is an Express app and not some other module?
var parentApp = function() {
  if (module.parent) {
    if (module.parent.exports) {
      return module.parent.exports;
    }
  }
  return null;
}();  //(load return value into var)


//console.log('parentApp:', parentApp);

// configuration
app.conf = require('./conf');
console.log('auth conf: ', app.conf);

// merge w/ parent conf.
// we want the PARENT to trump the child, since the parent needs to control sessions, etc!
if (parentApp) {
  if (!_.isUndefined(parentApp.conf)) {
    //console.log('parent has conf too!');
    _.extend(app.conf, parentApp.conf);
    console.log('merged w/parent conf: ', app.conf);
  }
}

// populate DB fresh or from parent
require('./lib/db')(app, parentApp, 'auth'); //3rd param for logging

// same w/ sessionStore
require('./lib/sessionStore')(app, parentApp, 'auth');


// leave bare, let MongooseAuth fill it in
var UserSchema = module.exports.UserSchema = new Schema({});



// EVERYAUTH
// wrapping all this in mongoose-auth plugins

// show all configurable options
//console.log('all fb options:', everyauth.facebook.configurable());

UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User:function () {
        return mongoose.model('User');    // attach the _model_
      }  
    }
  },
  
  facebook: {
    everyauth: {

      // [refactoring all this as keys in everyauth obj, rather than chained functions]
      myHostname: app.conf.hostName,  // otherwise oauth doesn't work
      appId: app.conf.fbAppId,
      appSecret: app.conf.fbAppSecret,
      scope: 'email',   // minimal
      

      // this runs w/existing session or w/oauth popup
      findOrCreateUser: function (session, accessToken, accessTokExtra, fbUser) {

        // console.log("findOrCreateUser",
        //   require('util').inspect({'session':session,'accessToken':accessToken,'accessTokExtra':accessTokExtra,'fbUser':fbUser})
        // );

        var promise = this.Promise()
          , User = this.User()();  // convoluted way of getting the MODEL... simplify?

        // == stripped email check, ID is enough ==

        // console.log('Looking for user with fb.id %s', fbUser.id);
        
        // try to match ID instead ..?    (@todo why are both of these necessary??)
        User.findOne({'fb.id': fbUser.id}, function (err, user) {
          
          // should be a complete user obj w/ all FB metadata
          if (user) {
            // console.log('user match on fb.id %s', user);
            return promise.fulfill(user);
          }

          // console.log("CREATING FB USER");
          
          // createWithFB() is a model 'static', part of mongoose-auth
          // but this doesn't SAVE anything to DB!
          User.createWithFB(fbUser, accessToken, accessTokExtra.expires, function (err, user) {
            if (err) {
              // console.log('ERROR creating fb User');
              return promise.fail(err);
            }
            
            // console.log('created FB user:', user);
            
            // [ADDED]
            // save to DB. this adds onto existing record.
            user.save(function (err, user) {
              if (err) {
                // console.log("Error saving FB user to DB");
                return promise.fail(err);
              }
              // console.log('saved FB user to DB', user);
              
              promise.fulfill(user);
              // (this goes on to addToSession(), which puts userId in req.session.auth.userId)
            });
            
          });
        }); //findOne

        return promise;
      }, //findOrCreateUser

      redirectPath: '/app',     // was /auth, but that doesn't do anything
                                // does this respect app.redirect() mapping??

      entryPath: '/auth/facebook',
      callbackPath: '/auth/facebook/callback'

    } //everyauth
  } //facebook
}); //mongooseAuth plugins


var User = mongoose.model('User', UserSchema);


// == eliminated authenticateFromLoginToken ==


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(express.cookieParser());

  app.use(express.session({
    secret: app.conf.sessionSecret,
    //cookie: {maxAge: 60000*60*24*30},   // 30 days?
    store: app.sessionStore   // (mongo, above)
  }));


  app.use(app.router);

  app.use(mongooseAuth.middleware());  // routes for auths; wraps everyauth middleware.

  app.use(express.static(__dirname + '/public'));

  // view helpers
  // needs to run after modeling/plugin above.
  mongooseAuth.helpExpress(app);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  everyauth.debug = true;
  
  // @todo output every request, how?
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


// app-level redirect mapping, should handle sub-path
app.redirect('new', function(req, res) {
    console.log('dynamic redirect map in %s to /new', app.name);
    console.log('basepath is ', app.basepath);
    return '/new';
  });
app.redirect('auth', function(req, res) {
    console.log('dynamic redirect map in %s to /auth', app.name);
    return '/auth';
  });
app.redirect('bye', function(req, res) {
    console.log('dynamic redirect map in %s to /bye', app.name);
    return '/bye';
  });


// route middleware to get current user.
// simply load if available, don't require. (split to requireUser().)
app.loadUser = function(req, res, next) {
  console.log('in loadUser, app scope is %s', app.name);
  console.log('in loadUser, session:', req.session);

  // user already in session? (ID corresponds to DB record)
  // - tried to do a pause() here but failed. use simple var instead.
  
  var wait = false;
  if (! _.isUndefined(req.session.auth)) {
    if (! _.isUndefined(req.session.auth.userId)) {
      if (! _.isEmpty(req.session.auth.userId)) {
        wait = true;
        // console.log('userId already in session:', req.session.auth.userId);
        
        // retrieve this user from DB
        User.findById(req.session.auth.userId, function (err, user) {
          // console.warn('findById callback. still paused?');
          
          if (user) {
            req.user = user;
            console.log('user in session found in DB, set to req.user: ', req.user);
          }

          next();
          // console.warn('resuming.');
        });
      }
    }
  }

  // waiting for callback response?
  if (! wait) {
    // console.log('user not in session, continue w/o req.user');
    next();
  }
};


// for pages that need login. split from loadUser(), run after.
app.requireUser = function(req, res, next) {
  console.log('in requireUser');
  
  if (! _.isUndefined(req.user)) {
    if (! _.isUndefined(req.user.id)) {
      // console.log('have user Id in req, continue');
      next();
    }
  }
  
  console.log('no req.user.id found, go to /new');
  // console.log('session:', req.session);

  res.redirect('new'); //@see mapping
};


// Routes
// auth in middle

// @todo refactor this back into sep routes files
//app.get('/', app.loadUser, routes.index);

app.get('/', app.loadUser, app.requireUser, function (req, res) {
  // console.log('at /, redirect to /auth');
  // res.redirect('auth');
  
  // console.log('at /, redirect to /app');
  res.redirect('app');
});


app.get('/bye', app.loadUser, app.requireUser, function (req, res) {
  console.log('at /bye');
  if (req.session) {
    // console.log('has session, removing');
    req.session.destroy(function () {});
  }
  res.redirect('new');
});


// == removed /auth callback, does nothing ==


app.get('/app', app.loadUser, app.requireUser, function (req, res) {
  // console.log('at /app');
  
  res.render('app', {
    title: 'New Leaf Digital Apps',
  });
});


// what's the point of this path?
app.get('/new', app.loadUser, function (req, res) {
  // console.log('at /new');
  
  res.render('new', {
    title: 'New Leaf Digital Apps',
  });
});


app.dynamicHelpers({
  fbUser: function (req, res) {
    // console.log('using dynamic helper fbUser', req.user);
    if (req.user) 
      if (req.user.fb.id)
        return req.user;

  },
  
  // @learn is there a way for one dynamic helper to call another??
  fbUserName: function(req, res) {
    try {
      if (! _.isUndefined(req.user.fb.name.full)) {
        return req.user.fb.name.full;        
      }
    }
    catch(e) {}
  }
});


/*
 * global error catcher:
 process.on('uncaughtException',function(err){console.error('uncaughtexception:'+err.stack);});
*/


if (! module.parent) {
  app.listen(80);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
else {
  console.log('auth module has parent, not listening.');
}
