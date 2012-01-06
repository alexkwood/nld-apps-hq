// HQ app. central layer on top of auth and sub-apps.

// @todo figure out how to share modules between apps. want to require.paths.push(), but deprecated?
// @todo DB is now loaded in auth module, not parent. ok?
// @todo make error handlers work
// @todo every dynamic helper runs on every single request, so make sure any that do DB ops only run when needed!!
// @todo need indexes on mongoose schemas
// @todo add URL to http://mongoosejs.com/docs/in-the-wild.html

/*
@todo 1/5:
  - make lists use existing user, no prompt
  - apply canUser() check to each app
  - lists at URLs, etc [see evernote]
  - share functionality for lists
*/

var express = require('express')
  , _ = require('underscore')
  , messages = require('express-messages')


// this is the PARENT app
var app = module.exports = express.createServer();



// name for logging/scope checking
app.name = 'HQ';

// override console.log
var Log = require('./lib/console-log')('[' + app.name + ']');
console.log = Log.log, console.warn = Log.warn, console.error = Log.error;


app.appRoot = __dirname;
var libDir = app.appRoot + '/lib';

// load conf. (each child app might have its own conf.)
try {
  app.envId = require(libDir + '/env-id')(app);
  console.log('Identified environment: ', app.envId);
  app.conf = require('./conf.js')(app.envId);
}
catch(e) {
  console.error("Missing conf.js. Exiting. (" + e + ")");
  process.exit(1);
};
console.log('conf:', app.conf);

// run early so middleware doesn't screw w/favicon
app.use(express.favicon(app.appRoot + '/public/nld_favicon.png'));


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

  app.use(require('connect-less')({
    src: __dirname + '/public',     // dir w/ .less files
    // dst:                            // dir to store css files
    // dstRoot:         // public root, set it if `dstDir` is not your public root
    compress:false, 
    debug:true, 
    force:true,
    ignore: true      // [added]
  }));
});


app.configure('production', function(){
  app.use(express.errorHandler()); 
  
  // @todo tweak
  app.use(require('connect-less')({ src: __dirname + '/public', compress:true, debug:false, force:false }));
});

app.use(express.static(__dirname + '/public'));  // has to be after connect-less


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

app.use(function setDefaultMeta(req, res, next) {
  res.local('meta_description', '');
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
// console.log('MOUNTED FLASHCARDS!');


// load Interactive Lists app
var lists = require('./lists/lists.js');
app.use('/lists', lists);


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
