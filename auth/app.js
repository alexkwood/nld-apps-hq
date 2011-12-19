/*
 * Auth app for FB connect.
 * loosely based on node-social-auth-boilerplate, but stripped a lot of redundancies/junk.
 *
 * this should run both standalone and as a SUB-APP w/ nld-apps-hq.
 * auth middleware here will control access to other apps in NLD Apps Suite.
 *
 * IMPT: once a user is logged in, if they de-authorize the app in FB, they're still logged in!
 *  -- the whole LoginToken mess might have mitigated that, but not worth the complexity.
 *
 */

var express = require('express')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , mongooseAuth = require('mongoose-auth')
  , everyauth = require('everyauth')
  , _ = require('underscore')
  ;

var app = module.exports = express.createServer();

// run early so middleware doesn't screw w/favicon
app.use(express.favicon());

// name for logging/scope checking
app.name = 'Auth';

app.appRoot = __dirname;


// is there a better way to do this??
// how do we know the parent is an Express app and not some other module?
// [could use mounted() callback but only 1 allowed, and this should apply before mounting]
var parentApp = function() {
  if (module.parent) 
    if (module.parent.exports) 
      return module.parent.exports;
  
  return null;
}();  //(load return value into var)


/*
app.mounted(function(parent) {
  console.warn('CAUGHT %s app mounted by %s', app.name, parent.name);
});
*/


// configuration
app.conf = require('./conf');


// merge w/ parent conf.
// we want the PARENT to trump the child, since the parent needs to control sessions, etc!
if (parentApp) {
  if (!_.isUndefined(parentApp.conf)) {
    _.extend(app.conf, parentApp.conf);
  }
}


// populate DB fresh or from parent
require('./lib/db')(app, parentApp);

// same w/ sessionStore
require('./lib/sessionStore')(app, parentApp);


app.UserSchema = require('./lib/user-schema').UserSchema;

// roles incl roles, defaulRole, canRole()
var roles = require('./lib/roles');


// EVERYAUTH
// wrapping all this in mongoose-auth plugins

// show all configurable options
//console.log('all fb options:', everyauth.facebook.configurable());

app.UserSchema.plugin(mongooseAuth, {
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

      redirectPath: '/',     // was /auth, then /app, try root.
                             // does this respect app.redirect() mapping??

      entryPath: '/auth/facebook',
      callbackPath: '/auth/facebook/callback'

    } //everyauth
  } //facebook
}); //mongooseAuth plugins


var User = mongoose.model('User', app.UserSchema);


app.use(express.logger('[Auth] :method :url')); 

// @todo are these necessary w/ parentApp??
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.bodyParser());
app.use(express.methodOverride());

app.use(express.cookieParser());

  if (! parentApp) {
    app.use(express.session({
      secret: app.conf.sessionSecret,
      //cookie: {maxAge: 60000*60*24*30},   // 30 days?
      store: app.sessionStore   // (mongo, above)
    }));
  }

// routes for auths; wraps everyauth middleware. only apply to parent app.
if (parentApp) parentApp.use(mongooseAuth.middleware());
else app.use(mongooseAuth.middleware());


// only use local stylesheets etc if no parent.
// can there be >1 static dir? mounted under?
if (!parentApp) app.use(express.static(__dirname + '/public'));

// view helpers
// needs to run after modeling/plugin above.
mongooseAuth.helpExpress(app);

// klugy: load everyauth view helpers on parent app too.
// what's the proper way to share dynamic helpers?
if (parentApp) {
  mongooseAuth.helpExpress(parentApp);
}


app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  everyauth.debug = true;
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// IMPT: if an app.redirect() is defined here, and a middleware define here uses it,
// and a parent app uses that middleware, the parent app won't have the redirect mappings.
// (would need to copy app.redirects separately)

/*
// test: does a global middleware set in a sup-app work in parent?
app.use( function testAuthGlobalMiddleware(req,res,next) {
  console.log('in auth global middleware!');
  next();
});
*/


// WHY AREN'T ANY OF THESE ERROR HANDLERS WORKING???
// do they need to go in a configure() block?
app.error(function(err, req, res, next) {
  console.log('*** in auth app.error handler');
  res.end('HORRIBLE FAIL.');
});
app.use(function(err, req, res, next) {
  console.log('*** in auth app.error handler');
  res.end('HORRIBLE FAIL.');
});




// route middleware to get current user.
// simply load if available, don't require. (split to requireUser().)
app.loadUser = function loadUser(req, res, next) {
  console.log('in loadUser, app scope is %s', app.name);
  //console.log('in loadUser, session:', req.session);
 
  // make sure this only runs once per request
  if (req.ranLoadUser) {
    console.error('Already ran loadUser, skip');
    next();
  }
  else {
    req.ranLoadUser = true;
  }


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
          
          if (!err && user) {
            req.user = user;
            console.log('user in session found in DB, set to req.user');  //: ', req.user);
            
            res.local('user', user);
            
            next();
          }
          else {
            console.log('UNABLE TO FIND USER! 403');
            res.send('Sorry, can\'t find your user', 403);
          }

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
if (parentApp) parentApp.loadUser = app.loadUser;


// make sure loadUser runs on every request
// if mounted, set only on parent app, otherwise dup
if (parentApp) {
  //console.warn('APPLYING loadUser middleware to parent app.');
  parentApp.use( parentApp.loadUser );
  //console.log('parent stack after:', parentApp.stack);
}
//else {
// == try on both ==
//console.warn('no parent app, setting up loadUser to be applied on configure.');
  //console.warn('APPLYING loadUser middleware to auth app.');
  app.use( app.loadUser ); 
  //console.log('auth stack after:', app.stack);
//}



// helper to check if user is logged into request
// return boolean
// [switched this from req.user.id to req.user._id to match actual obj]
app.isUserLoggedIn = function isUserLoggedIn(req) {
  if (! _.isUndefined(req.user)) 
    if (! _.isUndefined(req.user._id)) {
      console.log('appears that user is logged in: ', req.user._id);
      return true;
    }

  console.log('user does NOT seem to be logged in');
  return false;
};
if (parentApp) app.isUserLoggedIn = app.isUserLoggedIn;


// for pages that need login. split from loadUser(), run after.
app.requireUser = function requireUser(req, res, next) {
  console.log('in requireUser');
  
  if (app.isUserLoggedIn(req)) return next();
 
  console.log('no req.user._id found, go to /login');
  // console.log('session:', req.session);
  res.redirect('/login');
  res.end() //?
};
if (parentApp) parentApp.requireUser = app.requireUser;


// for pages that need login by user w/ specific permission.
// called w/ param - app.requireUserCan('do_something') - so needs to return a _function_
// also calls requireUser() inside, so no need to run both separately.
// trying a wonky approach...
app.requireUserCan = function requireUserCan(doWhat) {
  // array puts both callbacks on the stack async'ly
  return [
    app.requireUser,

    function requireUserCan(req, res, next) {
      console.log('checking if user can ' , doWhat);

      if (! req.user.canUser(doWhat)) {   // (return should be sync)
        console.log('neg response from canUser');

        // @todo something nicer
        // THIS ISN'T WORKING -- THROWS HEADER ERROR
        console.log('access denied');
        res.send(403);
        //next(new Error('Unauthorized'));    // none of the error catchers are working - fix!
      }
      else {
        console.log('positive response from CanUser');
      }

      //console.log('requireUserCan continues');
      next();
    }

  ];  //callback stack
};
if (parentApp) parentApp.requireUserCan = app.requireUserCan;



// make dynamicHelpers (for views) available to this app and parent app.
function applySharedDynamicHelpers(app) {
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
}
applySharedDynamicHelpers(app);
if (parentApp) applySharedDynamicHelpers(parentApp);


// tmp: make sure loadUser is running globally
// WHY OH WHY OH WHY IS THIS RUNNING ___BEFORE___ loadUser??????????
app.ensureLoadUser = function ensureLoadUser(req, res, next) {
  //console.warn('in ensureLoadUser.');
  if (req.ranLoadUser) {
    //console.warn('Already ran loadUser, GOOD');
    next();
  }
  else {
    console.error('loadUser should have run already! BADDD');
    return res.end('FAIL');
  }
};
if (parentApp) parentApp.ensureLoadUser = app.ensureLoadUser;



app.use(app.router);  //(redundant now)


// Routes

// do we need check if parent app has a route at same path, don't load this if so? ... appears not, parent route overrides. (good)
app.get('/', app.ensureLoadUser, app.requireUser, function (req, res) {
  //console.warn('rendering AUTH index');
  res.render('app', {
    title: 'Auth',
  });
});


// [don't need to check if logged in to logout]
app.get('/bye', function (req, res) {
  if (req.session) {
    req.session.destroy(function () {});
  }
  res.redirect('/');
  res.end(); //?
});


app.get('/login', app.ensureLoadUser, function (req, res) {
  // if already logged in, redirect to app
  if (app.isUserLoggedIn(req, res)) {
    console.log('user is already logged in, redirect to app');
    res.redirect('/');
    res.end(); //?
  }

  res.render('login', {
    title: 'New Leaf Digital Apps',
  });
});


// placeholder
app.get('/admin', app.ensureLoadUser, app.requireUserCan('admin_users'),
  function(req, res, next) {
    res.send('Captain on deck');
  }
);



// WHY AREN'T ANY OF THESE ERROR HANDLERS WORKING???

app.error(function(err, req, res, next) {
  console.log('*** in auth app.error handler');
  res.end('HORRIBLE FAIL.');
});
app.use(function(err, req, res, next) {
  console.log('*** in auth app.error handler');
  res.end('HORRIBLE FAIL.');
});



// global error catcher
/*process.on('uncaughtException',function(err){
  console.error('uncaught exception:', err.stack);
});*/



if (! module.parent) {
  app.listen(80);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
else {
  console.log('auth module has parent, not listening.');
}
