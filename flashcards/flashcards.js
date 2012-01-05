// Spanish Flashcards app -- learning node.js & express.js with mongodb

// @todo allow res.redirect(/logout) to go to parent logout

var express = require('express')
  , util = require('util')
  , messages = require('./messages')   // [modified from lib]
  , _ = require('underscore')._


var app = module.exports = express.createServer();
app.name = 'Flashcards';

app.appRoot = __dirname;

var parentApp = function() {
  if (module.parent && module.parent.exports) return module.parent.exports;
  return null;
}();

// pointer to top app
var primaryApp = parentApp ? parentApp : app;

app.mounted(function(parent){
  console.warn('Flashcards app detects mount by parent app %s', parent.name);
});

if (! parentApp) app.use(express.favicon());

// use parent lib for common stuff
var libDir = parentApp ? parentApp.appRoot + '/lib' : app.appRoot + '/lib';


if (parentApp) {
  // override console.log
  var Log = require(libDir + '/console-log')('[' + app.name + ']');
  console.log = Log.log, console.warn = Log.warn, console.error = Log.error;
}


// configuration
try {
  app.envId = require(libDir + '/env-id')(app);
  app.conf = require('./conf.js')(app.envId);
  
  // merge w/ parent conf.
  // we want the PARENT to trump the child, since the parent needs to control sessions, etc!
  if (parentApp) {
    if (!_.isUndefined(parentApp.conf)) {
      _.extend(app.conf, parentApp.conf);
    }
  }
}
catch(e) {
  console.error("Missing conf.js!");
  process.exit(1);
}


// populate DB fresh or from parent
// [removed earlier mongoHandler]
require(libDir + '/db')(app, parentApp);

// pull a raw DB connection from the mongoose connection
var LegacyMongoHandler = require('./db/mongodb');
app.legacyDB = new LegacyMongoHandler(app.db.connection.db);
console.log('legacy DB name:', app.legacyDB.db.databaseName);

// same w/ sessionStore
require(libDir + '/sessionStore')(app, parentApp);


// @todo make this variable?
app.wordLanguages = {
  "en": "English",
  "es": "Spanish"
};


app.set('views', __dirname + '/views');
app.set('view engine', 'jade');


// default/global view vars [can define functions that accept params from templates]
app.set('view options', {
  getWordType: require('./models/word').getWordType
});


// middleware [use as simple variables, _can't_ pass params into them from templates]
// namespaced to this app to differentiate from parent app!
var sharedDynamicHelpers = {
    fcAppTitle: function(req, res) {
      // if (parentApp) {
      //   if (parentApp.isUserLoggedIn(req)) {
      //     return req.user.displayName() + "'s Spanish Flashcards";
      //   }
      // }
      return "My Spanish Flashcards";
    }

    // shared?
  , messages: messages        // from express-messages module, use req.flash() to populate.

  // return the app's mount-point so that urls can adjust
  , fcBase: function(req, res){
      return '/' == app.route ? '' : app.route;
    }
  
    // generate a body class based on URL
  , fcBodyClass: function(req, res) {
      var parts = _.compact( require('url').parse(req.url).pathname.split('/') );
      
      if (parts.length == 0) return 'home';
      else {        
        // strip the mount point
        if (parts[0] === app.route.replace(/^\//, '')) parts.shift();

        return parts.join('-');
      }
    }
  
    // @todo merge this w/ Auth !todo ^5
  , fcIsLoggedIn: function(req, res) {
      return app.isLoggedIn(req);
    }
    
    /*
    // current url relative to mount point (used for nav)
    // -- is there a built-in way to get this?
    // -- actually not using anymore
  , fcUrl: function(req, res) {
      // [copied from fcBodyClass above]
      var parts = _.compact( require('url').parse(req.url).pathname.split('/') );
      if (parts[0] === app.route.replace(/^\//, '')) parts.shift();
      return parts.join('/');
    }
    */ 
};
// apply to primary app
primaryApp.dynamicHelpers(sharedDynamicHelpers);


// 'static' helpers
// app.helpers({  
// });



// Configuration

// (putting static first to avoid middleware?)
// can app have >1 static dir? ...yes, but files w/ same names will conflict)
app.use(express.static(__dirname + '/public'));

app.use(express.bodyParser());
// app.use(express.methodOverride());    // necessary?

// restrict to !parentApp ?
if (! parentApp) {
  app.use(express.cookieParser());    // ?
  app.use(express.session({ 
    secret: app.conf.sessionSecret, 
    cookie: {maxAge: 60000*60*24*30},   // 30 days?
    store: app.sessionStore
  }));
}

app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 


// per-environment config
// app.configure('development', function(){
//   app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
// });
// 
// app.configure('production', function(){
//   app.use(express.errorHandler()); 
// });


// default active nav
app.use(function setDefaultActiveNav(req, res, next) {
  res.local('activeNav', '');
  next();
})


// for a given req, check if user is logged in [used in multiple places]
app.isLoggedIn = function(req) {
  if (parentApp) {
    if (parentApp.isUserLoggedIn(req)) {
      return true;
    }
    else {
      console.warn('not logged in for isLoggedIn');
    }
  }
  else {
    console.warn('No parent app for isLoggedIn!!');
  }
  return false;
};


// for a given req, get the system name.
// needed for all Word db queries
app.username = function(req) {
  if (!_.isUndefined(req.user))
    if (!_.isUndefined(req.user.system_name))
      return req.user.system_name;
  
  return null;
}


// route middleware to authenticate user.
app.restrictUser = function(req, res, next) {
  console.log('in flashcards restrictUser', app.isLoggedIn(req));
  if (app.isLoggedIn(req)) {
    return next();
  }
  
  req.flash('error', "Please login to do that.");
  res.redirect('/login');
};


// tmp
// app.use(function fcLogUrl(req, res, next) {
//   console.log('--- at url:', req.url);
//   next();
// });


// Routes

app.use(app.router);

// delegate routers w/ closures
require('./routes/login.js')(app);
require('./routes/home.js')(app);
require('./routes/word.js')(app);
require('./routes/play.js')(app);
require('./routes/lookup.js')(app);



if (!module.parent) {
  app.listen(app.conf.port);    // , app.conf.hostName
  console.log("Express server listening to %s on port %d in %s mode", app.address().address, app.address().port, app.settings.env);  
}
else {
  console.log('Flashcards module has parent, not listening.');
}