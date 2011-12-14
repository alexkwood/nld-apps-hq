/*
 * todo:
 * - boilerplate has nice GET output in console, do the same here
 * - refactor code to be cleaner
 * 
 * IMPT: once a user is logged in, if they de-authorize the app in FB, they're still logged in!
 *  -- the whole LoginToken mess might have mitigated that, but not worth the complexity.
 */

var express = require('express')
  //, routes = require('./routes')
  , mongoose = require('mongoose')  // necessary here?
  , Schema = mongoose.Schema
  , mongooseAuth = require('mongoose-auth')
  , everyauth = require('everyauth')
  , _ = require('underscore')
  ;

var app = module.exports = express.createServer();

// configuration
app.conf = require('./conf');
// console.log('conf:', app.conf);


// (we need the db for the session store)
var db = require('./lib/db')(app)  // global connection
  , MongoStore = require('connect-mongodb')
  , sessionStore = new MongoStore({db: db.connection.db, /*reapInterval: 3000, /* collection: 'sessions'*/ })  
  ;
//console.log('db:', db);


// load schemas after DB connection

// leave bare, let MongooseAuth fill it in
var UserSchema = module.exports.UserSchema = new Schema({});

// == removed LoginToken ==



// EVERYAUTH
// wrapping all this in mongoose-auth plugins

// show all configurable options
//console.log('all fb options:', everyauth.facebook.configurable());

UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User:function () {
        console.log('everyauth requesting User model');
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

        console.log("findOrCreateUser"); // , 
        //   require('util').inspect({'session':session,'accessToken':accessToken,'accessTokExtra':accessTokExtra,'fbUser':fbUser})
        // );

        var promise = this.Promise()
          , User = this.User()();  // convoluted way of getting the MODEL... simplify?

        // == stripped email check, ID is enough ==

        console.log('Looking for user with fb.id %s', fbUser.id);
        
        // try to match ID instead ..?    (@todo why are both of these necessary??)
        User.findOne({'fb.id': fbUser.id}, function (err, user) {
          
          // HOW DOES IT GET IN DB IN THE FIRST PLACE???
          // ... saved somewhere by mongooseAuth ??
          
          // should be a complete user obj w/ all FB metadata
          if (user) {
            console.log('user match on fb.id %s', user);
            return promise.fulfill(user);
          }

          console.log("CREATING FB USER");
          
          // createWithFB() is a model 'static', part of mongoose-auth
          // but this doesn't SAVE anything to DB!
          User.createWithFB(fbUser, accessToken, accessTokExtra.expires, function (err, user) {
            if (err) {
              console.log('ERROR creating fb User');
              return promise.fail(err);
            }
            
            console.log('created FB user:', user);
            
            // [ADDED]
            // save to DB. this adds onto existing record.
            user.save(function (err, user) {
              if (err) {
                console.log("Error saving FB user to DB");
                return promise.fail(err);
              }
              console.log('saved FB user to DB', user);
              
              promise.fulfill(user);
              // (this goes on to addToSession(), which puts userId in req.session.auth.userId)
            });
            
          });
        }); //findOne

        return promise;
      }, //findOrCreateUser

      redirectPath: '/app',     // was /auth, but that doesn't do anything
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
    store: sessionStore
  }));


  app.use(app.router);

  // this fills in the routes for each auth...? (should run after app.router)
  //app.use(everyauth.middleware()); 
  app.use(mongooseAuth.middleware());  // wraps everyauth middleware. 

  app.use(express.static(__dirname + '/public'));

  //everyauth.helpExpress(app);
  // needs to run after modeling/plugin above.
  mongooseAuth.helpExpress(app);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  everyauth.debug = true;
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});



// route middleware to get current user.
// simply load if available, don't require. (split to requireUser().)
var loadUser = function(req, res, next) {
  console.log('in loadUser, session:', req.session);

  // user already in session? (ID corresponds to DB record)
  // - tried to do a pause() here but failed. use simple var instead.
  
  var wait = false;
  if (! _.isUndefined(req.session.auth)) {
    if (! _.isUndefined(req.session.auth.userId)) {
      if (! _.isEmpty(req.session.auth.userId)) {
        wait = true;
        console.log('userId already in session:', req.session.auth.userId);
        
        // retrieve this user from DB
        User.findById(req.session.auth.userId, function (err, user) {
          console.warn('findById callback. still paused?');
          
          if (user) {
            console.log('req.user before re-setting:', req.user);
            // req.currentUser = user;
            req.user = user;
            console.log('user in session found in DB, set to req.user: ', req.user);
          }

          next();
          console.warn('resuming.');
        });
      }
    }
  }

  // waiting for callback response?
  if (! wait) {
    console.log('user not in session, continue w/o req.user');
    next();    
  }
};


// for pages that need login. split from loadUser(), run after.
var requireUser = function(req, res, next) {
  console.log('in requireUser');
  
  if (! _.isUndefined(req.user)) {
    if (! _.isUndefined(req.user.id)) {
      console.log('have user Id in req, continue');
      next();
    }
  }
  
  console.log('no req.user.id found, go to /new');
  // console.log('session:', req.session);
  res.redirect('/new');
};


// Routes
// auth in middle

// @todo refactor this back into sep routes files
//app.get('/', loadUser, routes.index);

app.get('/', loadUser, requireUser, function (req, res) {
  // console.log('at /, redirect to /auth');
  // res.redirect('/auth');
  
  console.log('at /, redirect to /app');
  res.redirect('/app');
});


app.get('/bye', loadUser, requireUser, function (req, res) {
  console.log('at /bye');
  if (req.session) {
    console.log('has session, removing');
    // LoginToken.remove({ userid:req.session.userId }, function () {});
    // res.clearCookie('logintoken');
    req.session.destroy(function () {});
  }
  res.redirect('/new');
});


// == removed /auth callback, does nothing ==


app.get('/app', loadUser, requireUser, function (req, res) {
  console.log('at /app');
  
  res.render('app', {
    title: 'New Leaf Digital Apps',
  });
});


// what's the point of this path?
app.get('/new', loadUser, function (req, res) {
  console.log('at /new');
  
  res.render('new', {
    title: 'New Leaf Digital Apps',
  });
});


app.dynamicHelpers({
  fbUser: function (req, res) {
    console.log('using dynamic helper fbUser', req.currentUser);
    if (req.currentUser) {
      if (req.currentUser.fb.id) {
        return req.currentUser;
      }
    }
  }
});


/*
 * global error catcher:
 process.on('uncaughtException',function(err){console.error('uncaughtexception:'+err.stack);});
*/


if (!module.parent) {
  app.listen(80);
  console.log("Express server listening");  // on port %d in %s mode", app.address().port, app.settings.env);
}
