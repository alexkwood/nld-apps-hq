// HQ app. central layer on top of auth and sub-apps.

// @todo figure out how to share modules between apps. want to require.paths.push(), but deprecated?
// @todo look in the express examples for smart favicon handling, before the logger.

var express = require('express')
  , routes = require('./routes')
  , _ = require('underscore')
  ;

// this is the PARENT app
var app = module.exports = express.createServer();


// name for logging/scope checking
app.name = 'HQ';


// load conf. (each child app might have its own conf.)
app.conf = require('./conf');
console.log('parent conf: ', app.conf);


// populate DB [fresh] -- using lib in auth submod
require('./auth/lib/db')(app, null, 'hq'); //3rd param for logging

// same w/ sessionStore
require('./auth/lib/sessionStore')(app, null, 'hq');


app.use(express.logger(':method :url'));


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

  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});




// load auth sub-app
var auth = require('./auth/app.js');

// this doesn't seem to work
auth.mounted(function(parent){
  console.log('parent app caught auth mount');
});


// test app.name
console.log('parent app is named %s', app.name);
console.log('auth app is named %s', auth.name);


// MOUNT at sub-path. auto-namespaces paths at sub.
//app.use('/auth', auth);
// -- change: auth paths should be global, make sure apps don't overlap.
app.use(auth);


// try to set up middleware that runs on EVERY PATH w/o being explicitly defined on each one.
// (for sub-apps to require auth automatically)
// @learn how can the ORDER of these middlewares be controlled?
app.use( function (req, res, next) {
  console.log('IN GLOBAL MIDDLEWARE! HOORAY!');

  next();
});


// test another sub-app for inheritance testing
var fakeApp = express.createServer();
fakeApp.get('/fake', function(req, res) { res.end('fake sub-app loaded'); });
app.use(fakeApp);


// Routes
// @todo set a global 'local' w/ app title
app.get('/', auth.loadUser, auth.requireUser, routes.index);


if (! module.parent) {
  app.listen(80);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
else {
  console.log('HQ app has parent, not listening.');
}
