
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , everyauth = require('everyauth')
  , util = require('util')
  , Seq = require('seq')
  ;

var app = module.exports = express.createServer();


// Configuration

app.configure(function(){
  app.set('dbHost', 'localhost');
  app.set('dbName', 'nld_apps');  // @todo separate this for prod/dev

  app.set('fbAppId', '214626601947311');
  app.set('fbAppSecret', 'c039b7f9b7eeae96b9e406a46777755b');
});



// (we need the db for the session store)
var db = require('./lib/db')(app)  // global connection
  , MongoStore = require('connect-mongodb')
  , sessionStore = new MongoStore({db: db, reapInterval: 3000, collection: 'sessions'})  
  ;


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(express.cookieParser());

  app.use(express.session({
    secret: 'ab55e616a760d302',
    //cookie: {maxAge: 60000*60*24*30},   // 30 days?
    store: sessionStore
  }));

  app.use(everyauth.middleware());  

  app.use(app.router);
  app.use(express.static(__dirname + '/public'));

  everyauth.helpExpress(app);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  everyauth.debug = true;
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


var users = require('./models/users');

// db test
users.findUser({}, function(err, users) { if (err) throw(err); console.log('users from Db:', users); });


//
// EVERYAUTH
//
// show all configurable options
//console.log('all fb options:', everyauth.facebook.configurable());

everyauth.facebook
  .appId(app.set('fbAppId'))
  .appSecret(app.set('fbAppSecret'))
  //.handleAuthCallbackError( function (req, res) {})

  // this runs w/existing session or w/oauth popup
  .findOrCreateUser( function (session, accessToken, accessTokExtra, fbUser) {
    console.log("findOrCreateUser:", util.inspect({'session':session,'accessToken':accessToken,'accessTokExtra':accessTokExtra,'fbUser':fbUser}));

    var promise = this.Promise();

    // NONE OF THIS IS RUNNING!!

    // find a user matching returned metadata
    users.findUser({ method: 'facebook', remoteUserId: fbUser.id }, function(err, user) {
      console.log('results of finding user:', err, user);

      if (err) return promise.fail(err);

      // user not yet in DB, create
      if (user.length == 0) {
        console.log('user not yet in DB');

        var newUser = {
          method: 'facebook',
          remoteUserId: fbUser.id,
          displayName: fbUser.name,
          fbMeta: fbUser
        };
        users.addUser(newUser, function(err, user) {
          if (err) {
            console.log("error adding user: ", err);
            return promise.fail(err);
          }
          
          console.log('added new user:', user);
          promise.fulfill(user);
        });

      }
      // user exists, return
      else {
        console.log('found user:', user);
        promise.fulfill(user);
      }
    });

    return promise;
  })
  .redirectPath('/');  // does this have to be an absolute url?


everyauth.everymodule.findUserById( function(userId, callback) {
  console.log('attempting to findUserById: ', userId);

  //users.findById(callback);
  users.findById(userId, function(err, user) {
    if (err) { console.log('error:', err); return callback(err); }
    console.log('found user:', user);
    callback(null, user);
  });
});





// Routes

app.get('/', routes.index);


app.listen(80);
console.log("Express server listening");  // on port %d in %s mode", app.address().port, app.settings.env);
