
var express = require('express')
  , routes = require('./routes')
  , mongooseAuth = require('mongoose-auth'),
  , everyauth = require('everyauth')
  , util = require('util')
  //, Seq = require('seq')
  ;

var app = module.exports = express.createServer();


app.configure(function(){

  // @todo put the configs in a separate module  
  app.set('dbHost', 'localhost');
  app.set('dbName', 'nld_apps');  // @todo separate this for prod/dev

  app.set('fbAppId', '214626601947311');
  app.set('fbAppSecret', 'c039b7f9b7eeae96b9e406a46777755b');
});


// (we need the db for the session store)
var db = require('./lib/db')(app)  // global connection
  , MongoStore = require('connect-mongodb')
  , sessionStore = new MongoStore({db: db.connection.db, reapInterval: 3000, /* collection: 'sessions'*/ })  
  ;
//console.log('db:', db);

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
  app.use(mongooseAuth.middleware());  // wraps everyauth middleware

  app.use(express.static(__dirname + '/public'));

  //everyauth.helpExpress(app);
  mongooseAuth.helpExpress(app);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  everyauth.debug = true;
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


// load users after DB connection
// what's the right way to export the model and helpers?
var UserSchema = require('./models/users').UserSchema
  //, User = Users.User    // ???
  , LoginTokenSchema = require('./models/logintoken').LoginTokenSchema
  //, LoginToken = LoginTokens.LoginToken
  , LoginToken = mongoose.model('LoginToken')
  ;




// db test
//Users.findUser({}, function(err, users) { if (err) throw(err); console.log('users from Db:', users); });


// EVERYAUTH
// wrapping all this in mongoose-auth plugins

// show all configurable options
//console.log('all fb options:', everyauth.facebook.configurable());

UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User:function () { return User; }  // not sure what this is for
    }
  },
  
  facebook: {
    everyauth: {

      // [refactoring all this as keys in everyauth obj, rather than chained functions]
      //
      appId: app.set('fbAppId'),
      appSecret: app.set('fbAppSecret'),
      scope: 'email',  // ?
      
      //handleAuthCallbackError: function (req, res) {},

      // this runs w/existing session or w/oauth popup
      findOrCreateUser: function (session, accessToken, accessTokExtra, fbUser) {
        console.log("findOrCreateUser:", 
          util.inspect({'session':session,'accessToken':accessToken,'accessTokExtra':accessTokExtra,'fbUser':fbUser})
        );

        var promise = this.Promise()
          , User = this.User()();  // ???

        console.log('weird User obj: ', User);

        User.where('fb.email', fbUser.email).findOne(function (err, user) {
          if (!user) {
            console.log('no match on fb.email to %s', fbUser.email);
            User.findOne({'fb.id': fbUser.id}, function (err, foundUser) {
              if (foundUser) {
                console.log('match on fb.id %s', fbUser.id);
                return promise.fulfill(foundUser);
              }

              console.log("CREATING FB USER");
              User.createWithFB(fbUser, accessTok, accessTokExtra.expires, function (err, createdUser) {
                if (err) {
                  console.log("ERROR creating fb User');
                  return promise.fail(err);
                }
                
                console.log('created user:', createdUser);
                return promise.fulfill(createdUser);
              });
            });
          }
          // (matched by email)
          else {
            console.log('found user by email %s', fbUser.email);
            console.dir(user);

            assignFbDataToUser(user, accessTok, accessTokExtra, fbUser);
            user.save(function (err, user) {
              if (err) return promise.fail(err);
              promise.fulfill(user);
            });
          }
        });

        return promise;
      }, //findOrCreateUser

      redirectPath: '/',  // does this have to be an absolute url?
      entryPath: '/auth/facebook',
      callbackPath: '/auth/facebook/callback'

    } //everyauth
  } //facebook
}); //mongooseAuth plugins


function assignFbDataToUser(user, accessTok, accessTokExtra, fbUser) {
  console.log('in assignFbDataToUser');

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
}


// not needed anymore?
/*
everyauth.everymodule.findUserById( function(userId, callback) {
  console.log('attempting to findUserById: ', userId);

  //User.findById(callback);
  User.findById(userId, function(err, user) {
    if (err) { console.log('error:', err); return callback(err); }
    console.log('found user:', user);
    callback(null, user);
  });
});
*/


// why is this 2 lines?
// @todo consolidate if possible
// @todo move this back to model? can .model() run before the plugins are added?
mongoose.model('User', UserSchema);
var User = mongoose.model('User');


// route middleware to get current user
var loadUser = function(req, res, next) {
  console.log('in loadUser');

  // user already in session?
  if (req.session.user_id) {
    console.log('already in session');
    User.findById(req.session.user_id, function (err, user) {
      if (user) {
        console.log('session/user found');
        req.currentUser = user;
        next();
      } 
      else {
        console.log('not found, new');
        res.redirect('/new');
      }
    });
  }
  // coming back to new session w/ old token
  else if (req.cookies.logintoken) {
    console.log('old token, need auth');
    authenticateFromLoginToken(req, res, next);
  }
  else {
    console.log('no session, new');
    res.redirect('/new');
  }
};


// reload user info from old cookie
var authenticateFromLoginToken = function(req, res, next) {
  console.log('in authenticateFromLoginToken');
  var cookie = JSON.parse(req.cookies.logintoken);
  console.log('cookie:', cookie);
  
  LoginToken.findOne({
      userid:cookie.userid,
      series: cookie.series,
      token: cookie.token 
    }, 
    function onFindLoginToken(err, token) {
      if (!token) {
        console.log('no token found, redirect');
        res.redirect('/new');
        return;
      }
      console.log('found token: ', token);
      
      User.findOne({ _id:token.userid }, 
        function onFindUser(err, user) {
          if (user) {
            console.log('found user for token: ', user);
            req.session.user_id = user.id;
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
            res.redirect('/new');
          }
        } 
      );
    } //onFindLoginToken
  );
}; //authFrom..


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
    LoginToken.remove({ userid:req.session.user_id }, function () {});
    res.clearCookie('logintoken');
    req.session.destroy(function () {});
  }
  res.redirect('/new');
});


app.get('/auth', function (req, res) {
  console.log('at /auth');

  if (req.cookies.logintoken) {
    console.log('has login token, goto app');
    res.redirect('/app');
  }
  else {
    console.log('no logintoken yet');
    var loginToken = new LoginToken({ userid: req.user.id });
    console.log('new loginToken:', loginToken);
    loginToken.save(function() {
      res.cookie('logintoken', loginToken.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path:'/' });
      console.log('set cookie, goto app');
      res.redirect('/app');
    });
  }
});


app.get('/app', loadUser, function (req, res) {
  res.render('app', {
    title: 'New Leaf Digital Apps',
  });
});

app.get('/new', function (req, res) {
  res.render('new', {
    title: 'New Leaf Digital Apps',
  });
});


app.dynamicHelpers({
  fbUser: function (req, res) {
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

