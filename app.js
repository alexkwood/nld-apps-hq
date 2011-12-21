// HQ app. central layer on top of auth and sub-apps.

// @todo figure out how to share modules between apps. want to require.paths.push(), but deprecated?
// @todo DB is now loaded in auth module, not parent. ok?


var express = require('express')
  , _ = require('underscore')


// this is the PARENT app
var app = module.exports = express.createServer();


// run early so middleware doesn't screw w/favicon
app.use(express.favicon());


// name for logging/scope checking
app.name = 'HQ';


// load conf. (each child app might have its own conf.)
app.conf = require('./conf');


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


/*
// try to set up middleware that runs on EVERY PATH w/o being explicitly defined on each one.
// (this seems to be the FIRST middleware to run)
app.use( function testGlobalMiddleware(req, res, next) {
  console.warn('IN GLOBAL MIDDLEWARE, path is ', req.path);
  next();
});
*/


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
//console.warn('parent app is named %s', app.name);
//console.warn('auth app is named %s', auth.name);


// load partials for all routes
// IMPT: these need to run AFTER loadUser (in auth app, on load), for user to display
app.use(function setLocalTitle(req, res, next) {
  //console.warn('in setLocalTitle');
  res.local('title', 'NewLeafDigital Apps');
  next();
});

app.use(function loadPartials(req, res, next) {
  //console.warn('in loadPartials');
  
  // figure out how this is supposed to work... shouldn't need res.local() too
  res.partial('header', { /*as:'global'*/ }, function(err, html) {
    if (err) {
      console.error('Failed to render header: ', err);
      res.local('header', '');
      return next();
    }

    //console.warn('rendered header:', html);
    res.local('header', html);  // necessary? apparently so

    next();
  });
});


// load parent app's routes now. 
// ** MUST run __after__ auth loads, otherwise INDIVIDUAL ROUTE MIDDLEWARE FROM AUTH TAKE PRECEDENCE OVER GLOBAL MIDDLEWARE HERE!!
app.use(app.router);



// MOUNT AUTH APP at sub-path. auto-namespaces paths at sub.
//app.use('/auth', auth);
// -- change: auth paths should be global, make sure apps don't overlap.
console.warn('MOUNTING auth app');
app.use(auth);


app.dynamicHelpers({
  messages: require('express-messages')   // populate w/ req.flash()    
});


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


//console.log('app stack: ', app.stack);
//console.log('auth stack: ', auth.stack);


if (! module.parent) {
  app.listen(80);

  try {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  }
  catch(e) {
    console.error('Failed to listen to port 80 (' + e + '). Need sudo?');
    //process.exit(1);
  }

}
else {
  console.log('HQ app has parent, not listening.');
}
