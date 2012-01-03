// HQ app. central layer on top of auth and sub-apps.

// @todo figure out how to share modules between apps. want to require.paths.push(), but deprecated?
// @todo DB is now loaded in auth module, not parent. ok?
// @todo make error handlers work
// @todo ask on stackoverflow how to check if nested obj exists
// @todo every dynamic helper runs on every single request, so make sure any that do DB ops only run when needed!!
// @todo is there a way for each app to console.log() w/ a namespace?


var express = require('express')
  , _ = require('underscore')
  , messages = require('express-messages')


// this is the PARENT app
var app = module.exports = express.createServer();



// run early so middleware doesn't screw w/favicon
app.use(express.favicon());


// name for logging/scope checking
app.name = 'HQ';

app.appRoot = __dirname;
var libDir = app.appRoot + '/lib';

// load conf. (each child app might have its own conf.)
try {
  app.conf = require('./conf');
}
catch(e) {
  console.error("Missing conf.js. Exiting. (" + e + ")");
  process.exit(1);
};


// populate DB [fresh] -- using lib in auth submod
require(libDir + '/db')(app, null);

// same w/ sessionStore
require(libDir + '/sessionStore')(app, null);


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



// load auth sub-app
var auth = require('./auth/auth.js');


// auth.mounted(function(parent){
//   console.warn('parent app caught auth mount');
// });


// test app.name
//console.warn('parent app is named %s', app.name);
//console.warn('auth app is named %s', auth.name);


// load partials for all routes
// IMPT: these need to run AFTER loadUser (in auth app, on load), for user to display
app.use(function setLocalTitle(req, res, next) {
  res.local('title', 'NewLeafDigital Apps');
  next();
});

app.use(function loadPartials(req, res, next) {
  //console.warn('in loadPartials');
  
  // figure out how this is supposed to work... shouldn't need res.local() too
  res.partial('header', { /*as:'global'*/ }, function(err, html) {
    if (err) {
      console.error('Failed to render header: ', err);
      res.local('appsHeader', '');
      return next();    // (returns to loadPartials)
    }

    //console.warn('rendered header:', html);
    res.local('appsHeader', html);  // necessary? apparently so
    next();
  });
});


// load parent app's routes now. 
// ** MUST run __after__ auth loads, otherwise INDIVIDUAL ROUTE MIDDLEWARE FROM AUTH TAKE PRECEDENCE OVER GLOBAL MIDDLEWARE HERE!!
app.use(app.router);



// MOUNT AUTH APP at sub-path. auto-namespaces paths at sub.
//app.use('/auth', auth);
// -- change: auth paths should be global, make sure apps don't overlap.
// console.warn('MOUNTING auth app');
app.use(auth);


var sharedDynamicHelpers = {
  messages: messages   // populate w/ req.flash()
};
app.dynamicHelpers(sharedDynamicHelpers);
auth.dynamicHelpers(sharedDynamicHelpers);



// load Flashcards app too
var flashcards = require('./flashcards/flashcards.js');
app.use('/flashcards', flashcards);
console.log('MOUNTED FLASHCARDS!');


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
// -- this caught a mongo error in app.param()
var appErrorHandler = function(err, req, res, next) {
  console.log('*** in app.error handler', require('util').inspect(err));

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
  app.listen(app.conf.port);

  try {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  }
  catch(e) {
    console.error('Failed to listen to port ' + app.conf.port + ' (' + e + '). Need sudo?');
    //process.exit(1);
  }

}
else {
  console.log('HQ app has parent, not listening.');
}
