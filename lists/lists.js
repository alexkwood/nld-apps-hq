/**
 * interactive list app
 * running as sub-app inside NLD Apps
 * expanded/refactored from original proof-of-concept @ https://github.com/newleafdigital/interactive-shopping-list
 *
 * by Ben Buckman, http://newleafdigital.com
 */

// @todo graceful degradation to non-socket posts? (low priority)
// @todo more string escaping to prevent injections? ... (socket.io seems to escape well enough for now)
// @todo can take out 'if (parentApp)' conditions, can now assume parentApp exists
// @todo put in a catch-all POST handler w/ an error saying posts shouldn't work, socket must be broken!

var util = require('util')
  , express = require('express')
  , _ = require('underscore');

var app = module.exports = express.createServer();
  
app.name = 'Lists';
app.appRoot = __dirname;

var parentApp = function() {
  if (module.parent && module.parent.exports) return module.parent.exports;
  return null;
}();

// pointer to top app
var primaryApp = parentApp ? parentApp : app;


app.mounted(function(parent){
  console.warn('Lists app detects mount by parent app %s', parent.name);
});


// use parent lib for common stuff
var libDir = parentApp ? parentApp.appRoot + '/lib' : app.appRoot + '/lib';

// override console.log
if (parentApp) {
  var Log = require(libDir + '/console-log')('[' + app.name + ']');
  console.log = Log.log, console.warn = Log.warn, console.error = Log.error;
}

// configuration [none needed yet]
try {
  app.conf = {};    // copy other apps' method if needed
  if (parentApp) if (!_.isUndefined(parentApp.conf)) _.extend(app.conf, parentApp.conf);

  // and pass back up
  parentApp.conf = app.conf;
}
catch(e) {
  console.error("Missing conf.js!");
  process.exit(1);
}


// parent /views/lists is a symlink to this app's /views
// app.set('views', parentApp ? parentApp.appRoot + '/views/lists' : app.appRoot + '/views');
// (all layouts at root level, otherwise partials in inherited templates don't handle relative paths correctly)
app.set('views', primaryApp.appRoot + '/views');

app.set('view engine', 'jade');

// don't use default layout/body method, allow template inheritance instead
app.set('view options', { layout: false, compileDebug: true, pretty: true });


app.use(express.static(__dirname + '/public'));

// DB
require(libDir + '/db')(app, parentApp);

// sessions
require(libDir + '/sessionStore')(app, parentApp);

// app.use(express.cookieParser());   // ?

app.use(express.bodyParser());
// app.use(express.methodOverride());     // (don't need)


app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});



// models
var ListSchema = require('./lib/model-list')
  , List = app.db.model('List', ListSchema);


// set app-level body class
app.use(function setAppInfo(req, res, next) {
  // res.bodyClass = res.bodyClass || [];    // keep if already created ?
  res.bodyClass = [];    // drop parent app's
  res.bodyClass.push('app-lists');
  
  res.activeApp = 'lists';
  
  next();
});


var sharedDynamicHelpers = {
  listsBase: function(req, res){
    return '/' == app.route ? '' : app.route;
  }
  
, envId: function(req, res) {
    if (parentApp) return parentApp.envId;
  }
  
, listsAppTitle: function(req, res) {
    return 'Interactive Lists';
  }
};
// primaryApp.dynamicHelpers(sharedDynamicHelpers);
app.dynamicHelpers(sharedDynamicHelpers);   // necessary w/ switch to inherited templates ...?


// route middleware to authenticate user.
app.restrictUser = function(req, res, next) {
  console.log('-- in lists.restrictUser');
  if (parentApp && parentApp.isUserLoggedIn(req)) return next();

  if (req.url !== '/') {    // (message on inside ops but not home)
    req.flash('error', "Please login to do that.");
  }

  // delegate
  if (parentApp) parentApp.requireUser(req, res, next);
  else res.end("Missing parent app");

  //res.redirect('/login');     // @todo go to root /login not app
};


require('./routes/routes')(app);


// sockets
// (sockets need to run on listening app, otherwise (e.g.) client js doesn't load)
var io = require('socket.io').listen(primaryApp);
require('./lib/sockets')(app, io);


if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening to %s on port %d in %s mode", app.address().address, app.address().port, app.settings.env);
}
else {
  console.log('Lists module has parent, not listening.');
}
