// HQ app. central layer on top of auth and sub-apps.

// @todo figure out how to share modules between apps. want to require.paths.push(), but deprecated?
// @todo look in the express examples for smart favicon handling, before the logger.
//      - express.favicon() ?
// @todo DB is now loaded in auth module, not parent. ok?
// @todo remove app.configure() except for specific envts, redundant

var express = require('express')
  //, routes = require('./routes')
  , _ = require('underscore')
  ;

// this is the PARENT app
var app = module.exports = express.createServer();


// run early so middleware doesn't screw w/favicon
app.use(express.favicon());


// name for logging/scope checking
app.name = 'HQ';


// load conf. (each child app might have its own conf.)
app.conf = require('./conf');
//console.log('parent conf: ', app.conf);


// populate DB [fresh] -- using lib in auth submod
require('./auth/lib/db')(app, null);

// same w/ sessionStore
require('./auth/lib/sessionStore')(app, null);


app.use(express.logger('[HQ] :method :url'));


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



app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 

  app.use(require('connect-less')({ src: __dirname + '/public', compress:false, debug:true, force:true })); 
  app.use(express.static(__dirname + '/public'));  // has to be after connect-less
});


app.configure('production', function(){
  app.use(express.errorHandler()); 
  
  app.use(require('connect-less')({ src: __dirname + '/public', compress:true, debug:false, force:false }));
  app.use(express.static(__dirname + '/public'));
});


// try to set up middleware that runs on EVERY PATH w/o being explicitly defined on each one.
// (this seems to be the FIRST middleware to run)
app.use( function testGlobalMiddleware(req, res, next) {
  console.warn('IN GLOBAL MIDDLEWARE, path is ', req.path);
  next();
});

// load this app's routes now. (before mounting, otherwise mounted app's roots take precedence.)
app.use(app.router);


// load auth sub-app
console.warn('parent app loading Auth app...');
var auth = require('./auth/app.js');
console.warn('Auth app LOADED but not yet mounted.');

/*
auth.mounted(function(parent){
  console.warn('parent app caught auth mount');
});
*/


// test app.name
console.warn('parent app is named %s', app.name);
console.warn('auth app is named %s', auth.name);


console.warn('APPLYING partials middleware to app.');

// load partials for all routes
// IMPT: these need to run AFTER loadUser (in auth app), for user to display
app.use(function setLocalTitle(req, res, next) {
    console.warn('in setLocalTitle');
    res.local('title', 'NewLeafDigital Apps');
    res.local('testLocal', 'testing');
    next();
});

app.use(function loadPartials(req, res, next) {
  console.warn('in loadPartials');
  res.partial('header.jade', {}, function(err, html) {
    if (err) {
      console.error('Failed to render header: ', err);
      res.local('header', '');
      return next();
    }
    console.warn('rendered header:', html);
    res.local('header', html);

    next();
  });
});




// MOUNT AUTH APP at sub-path. auto-namespaces paths at sub.
//app.use('/auth', auth);
// -- change: auth paths should be global, make sure apps don't overlap.
// -- this also loads the middlware, like loadUser, into the stack.
console.warn('MOUNTING auth app');
app.use(auth);



// init auth routes now
// THIS IS PROBABLY STUPID, REMOVE AFTER VERIFYING THAT
auth.loadRouters(auth);


//app.dynamicHelpers({});


/*
// test another sub-app for inheritance testing
var fakeApp = express.createServer();
fakeApp.get('/fake', function(req, res) { res.end('fake sub-app loaded'); });
app.use(fakeApp);
*/


// Routes
require('./routes/index')(app);

// user admin
require('./routes/admin-users')(app, auth.UserSchema);



// error handling
var appErrorHandler = function(err, req, res, next) {
  console.log('*** in app.error handler', err);

  //if (err instanceof NotFound) {
  //  res.render('404.jade');
  //}
  //else {
  //  next(err);
  //}
    
  res.end("Error: " + err);
};
app.error(appErrorHandler);
auth.error(appErrorHandler);
app.use(appErrorHandler);
auth.use(appErrorHandler);



console.log('app stack: ', app.stack);
console.log('auth stack: ', auth.stack);


if (! module.parent) {
  app.listen(80);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
else {
  console.log('HQ app has parent, not listening.');
}
