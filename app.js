/*
 * todo:
 * - boilerplate has nice GET output in console, do the same here
 * - refactor code to be cleaner
 * - remove cruft
 * 
 */

var express = require('express')
  //, routes = require('./routes')
  , mongoose = require('mongoose')  // necessary here?
  , mongooseAuth = require('mongoose-auth')
  , everyauth = require('everyauth')
  , util = require('util')
  //, Schema = mongoose.Schema  // necessary here?
  , Seq = require('seq')
  , _ = require('underscore')
  ;

var app = module.exports = express.createServer();

// configuration
app.conf = require('conf');

// (we need the db for the session store)
var db = require('./lib/db')(app)  // global connection
  , MongoStore = require('connect-mongodb')
  , sessionStore = new MongoStore({db: db.connection.db, /*reapInterval: 3000, /* collection: 'sessions'*/ })  
  ;
//console.log('db:', db);


// load schemas after DB connection
var UserSchema = require('./models/users').UserSchema  // (filled out below before modeling)

  // REMOVING LOGIN TOKENS
  // , LoginTokenSchema = require('./models/logintoken').LoginTokenSchema
  // , LoginToken = mongoose.model('LoginToken', LoginTokenSchema)
  ;


// app.LoginToken = LoginToken;  // shouldn't be necessary, but was in demo

// db test
//Users.findUser({}, function(err, users) { if (err) throw(err); console.log('users from Db:', users); });


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
      scope: 'email',  // ?
      
      //handleAuthCallbackError: function (req, res) {},

      // TMP - intercept
      getSession: function (req, res) {
        console.log('in overridden getSession. session: ', req.session);
        return req.session;
      },

      // TMP - override to intercept
      sendResponse: function (res) {
        var redirectTo = this.redirectPath();
        console.log('in override sendResponse. redirecting to %s', redirectTo);
          if (!redirectTo) throw new Error('You must configure a redirectPath');
        res.writeHead(303, {'Location': redirectTo});
        res.end();
      },

      // this runs w/existing session or w/oauth popup
      findOrCreateUser: function (session, accessToken, accessTokExtra, fbUser) {

        console.log("findOrCreateUser:", 
          util.inspect({'session':session,'accessToken':accessToken,'accessTokExtra':accessTokExtra,'fbUser':fbUser})
        );

        var promise = this.Promise()
          , User = this.User()();  // ???

        console.log('LEARN: this.User = ', this.User);
        console.log('LEARN: this.User() = ', this.User());
        console.log('LEARN: this.User()() = ', User);

        console.log('Looking for user with fb.email %s', fbUser.email);
        
        // try to match email
        // == no reason for both of these!! ==
        /*User.where('fb.email', fbUser.email).findOne(function (err, user) {

          if (user) {   // matched by email
            console.log('found user by email %s', fbUser.email);
            console.dir(user);

            assignFbDataToUser(user, accessToken, accessTokExtra, fbUser);
            user.save(function (err, user) {
              if (err) {
                console.log("Error saving FB user");
                return promise.fail(err);
              }
              console.log('saved FB user info', user);
              promise.fulfill(user);
            });
          }
          else {  // no email match
            console.log('no match on fb.email to %s', fbUser.email);
            */
            
            // try to match ID instead ..?    (@todo why are both of these necessary??)
            User.findOne({'fb.id': fbUser.id}, function (err, foundUser) {
              
              // should be a complete user obj w/ all FB metadata
              if (foundUser) {
                console.log('match on fb.id %s', fbUser.id);
                return promise.fulfill(foundUser);
              }

              console.log("CREATING FB USER");
              
              // [createWithFB() is a model 'static', part of mongoose-auth]
              User.createWithFB(fbUser, accessToken, accessTokExtra.expires, function (err, createdUser) {
                if (err) {
                  console.log('ERROR creating fb User');
                  return promise.fail(err);
                }
                
                console.log('created FB user:', createdUser);
                promise.fulfill(createdUser);
              });
            }); //findOne

        //  }
        //});

        return promise;
      }, //findOrCreateUser

      redirectPath: '/auth',  // extremely important! whole process breaks if this is wrong
      entryPath: '/auth/facebook',
      callbackPath: '/auth/facebook/callback'

    } //everyauth
  } //facebook
}); //mongooseAuth plugins


/*function assignFbDataToUser(user, accessTok, accessTokExtra, fbUser) {
  console.log('in assignFbDataToUser');

  // is all this really necessary??
  user.fb.accessToken = accessTok;
  user.fb.expires = accessTokExtra.expires;
  user.fb.id = fbUser.id;
  user.fb.name.first = fbUser.first_name;
  user.fb.name.last = fbUser.last_name;
  user.fb.name.full = fbUser.name;
  user.fb.alias = fbUser.link.match(/^http:\/\/www.facebook\.com\/(.+)/)[1];
  user.fb.gender = fbUser.gender;
  user.fb.email = fbUser.email;
  user.fb.timezone = fbUser.timezone;
  user.fb.locale = fbUser.locale;
  user.fb.verified = fbUser.verified;
  user.fb.updatedTime = fbUser.updated_time;

  console.log('assigned: ', user.fb);
}*/


// not needed anymore?
// just seems to duplicate default behavior
/*everyauth.everymodule.findUserById( function(userId, callback) {
  console.log('attempting to findUserById [obsolete?]: ', userId);

  //User.findById(callback);
  User.findById(userId, function(err, user) {
    if (err) { console.log('error:', err); return callback(err); }
    console.log('found user:', user);
    callback(null, user);
  });
});*/



// move this back to model? can .model() run before the plugins are added?
// ... NO, once it's modeled it can't be modified! (see test-mongoose.js)
var User = mongoose.model('User', UserSchema);
console.log('modeled User');


/*
consolidating:
  - don't use cookies at all anymore
  - req.session.userId is the user ID  (formerly .user_id)
  - req.user is the whole user obj
  - eliminate req.currentUser
*/

// route middleware to get current user
var loadUser = function(req, res, next) {
  console.log('in loadUser');

  // user already in session? (ID corresponds to DB record)
  if (req.session.userId) {
    console.log('userId already in session:', req.session.userId);
    
    // retrieve this user from DB
    User.findById(req.session.userId, function (err, user) {
      if (user) {
        console.log('req.user before re-setting:', req.user);
        // req.currentUser = user;
        req.user = user;
        console.log('user in session found in DB, set: ', req.user);
        next();
      }
      else {
        console.log('user in session not found, goto /new');
        return res.redirect('/new');
      }
    });
  }
  // // coming back to new session w/ old token
  // else if (!_.isEmpty(req.cookies.logintoken)) {
  //   console.log('old token, need auth', req.cookies.logintoken);
  //   authenticateFromLoginToken(req, res, next);
  // }
  else {
    console.log('no user_id in session');
    console.log('session:', req.session);
    return res.redirect('/new');
  }
};


/*
// reload user info from old cookie
var authenticateFromLoginToken = function(req, res, next) {
  console.log('in authenticateFromLoginToken');
  console.log('all cookies:', req.cookies);
  var cookie = JSON.parse(req.cookies.logintoken);
  console.log('logintoken cookie:', cookie);
  
  //TMP
  LoginToken.find({}, function(err, tokens) { console.log("DEBUG: all tokens in DB: ", tokens); }); 

  LoginToken.findOne({
      userid:cookie.userid,
      series: cookie.series,
      token: cookie.token 
    }, 
    function onFindLoginToken(err, token) {
      // PROBLEM HERE -- no token!! should be a token...

      if (!token) {
        console.log('no token found, redirect');

        // FIX: make sure to delete the bad cookie! otherwise keeps going in loops trying to auth w/it.
        //delete req.cookies.logintoken;
        console.log('deleted bad logintoken cookie'); //, req.cookies);
        // HOW TO ACTUALLY _DELETE_ A COOKIE??
        res.cookie('logintoken', '');

        return res.redirect('/new');
      }
      console.log('found token: ', token);
      
      User.findOne({ _id:token.userid }, 
        function onFindUser(err, user) {
          if (user) {
            console.log('found user for token: ', user);
            req.session.userId = user.id;
            req.currentUser = user;
            
            token.token = token.randomToken();
            console.log('random token: ', token.token);
            token.save(function onTokenSave () {
              console.log('saved login token, setting cookie');
              res.cookie('logintoken', token.cookieValue, { expires:new Date(Date.now() + 2 * 604800000), path:'/' });
              next();
            });

          }
          // no user
          else {
            console.log('no user found for token, redirect');
            return res.redirect('/new');
          }
        } 
      );
    } //onFindLoginToken
  );
}; //authFrom..
*/


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(express.cookieParser());

  app.use(express.session({
    secret: 'ab55e616a760d302',  // @todo put in config
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





// Routes
// auth in middle

// @todo refactor this back into sep routes files
//app.get('/', loadUser, routes.index);

app.get('/', loadUser, function (req, res) {
  res.redirect('/auth');
});

app.get('/bye', loadUser, function (req, res) {
  console.log('at /bye');
  if (req.session) {
    console.log('has session, removing');
    // LoginToken.remove({ userid:req.session.userId }, function () {});
    // res.clearCookie('logintoken');
    req.session.destroy(function () {});
  }
  res.redirect('/new');
});


app.get('/auth', function (req, res) {
  console.log('at /auth');  //'. cookies? ', req.cookies);

  /*
  if (!_.isEmpty(req.cookies.logintoken)) {

    // [tmp?]
    // make sure the user's login token is in the DB
    Seq()
      .seq(function() {
        var next = this;
        LoginToken.find({}, function(err, tokens) {
          console.log("DEBUG: all tokens in DB: ", tokens); 
          next();
        });
      })
      .seq(function() {
        console.log('does it match logintoken cookie?', req.cookies.logintoken);
        this();
      })
      .seq(function() {
        console.log('has login token, goto app');
        res.redirect('/app');
        this();
      });
    return;
  }
  */

  console.log('req.user:', req.user);

  if (_.isUndefined(req.user)) {
    console.log('no req.user, redirect to /new');
    return res.redirect('/new');
  }

  // console.log('no logintoken yet, need to create');
  // var loginToken = new LoginToken({ userid: req.user.id });
  // console.log('new loginToken:', loginToken);
  // loginToken.save(function() {
  //   Seq()
  //   .seq(function() {
  //     var next = this;
  //     console.log('***SAVED logintoken.');
  //     LoginToken.find({}, function(err, tokens) { console.log("DEBUG: all tokens in DB: ", tokens); next() });
  //   });
  //   res.cookie('logintoken', loginToken.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path:'/' });
  //   console.log('set cookie, goto app');
  //   res.redirect('/app');
  // });
  
  console.log("WHAT TO DO NOW???");
  res.end("DEAD END");
});


app.get('/app', loadUser, function (req, res) {
  res.render('app', {
    title: 'New Leaf Digital Apps',
  });
});


// what's the point of this path?
app.get('/new', function (req, res) {
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

