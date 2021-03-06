/*
 New Leaf Digital Apps, by Ben Buckman, http://newleafdigital.com
 @see readme.md for more info

== HQ app: central layer on top of auth and sub-apps ==
*/

var express = require('express')
  , _ = require('underscore')
  // , messages = require('express-messages')
  ;

// this is the PARENT app
var app = module.exports = express.createServer();


// name for logging/scope checking
app.name = 'HQ';

// override console.log
var Log = require('./lib/console-log')('[' + app.name + ']');
console.log = Log.log;
console.warn = Log.warn;
console.error = Log.error;


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
}
console.log('conf:', app.conf);

// run early so middleware doesn't screw w/favicon
app.use(express.favicon(app.appRoot + '/public/nld_favicon.png'));


// populate DB [fresh] -- using lib in auth submod
// using a callback here to avoid a race condition w/ connect-mongodb. [see https://github.com/masylum/connect-mongodb/issues/42]
require(libDir + '/db')(app, null, function(error){
  console.log('In parent app DB connection callback');
  
  if (error) throw error;
  
  // same w/ sessionStore
  require(libDir + '/sessionStore')(app, null);


  app.use(express.logger('[HQ] :method :url'));


  app.set('views', app.appRoot + '/views');
  app.set('view engine', 'jade');

  // don't use default layout/body method, allow template inheritance instead
  app.set('view options', { layout: false, compileDebug: true, pretty: true });

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

    // LessCSS
    app.use(require('connect-less')({
      src: app.appRoot + '/public',     // dir w/ .less files
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

    app.use(require('connect-less')({ src: app.appRoot + '/public', compress:true, debug:false, force:false }));
  });

  app.use(express.static(app.appRoot + '/public'));  // has to be after connect-less


  // load auth sub-app. [now async]
  require('./auth/auth.js')(function(error, auth){
    if (error) throw error;

    console.log("In auth mount callback - got", auth.name, "- continue loading app");

    // auth.mounted(function(parent){
    //   console.warn('parent app caught auth mount');
    // });


    // load partials for all routes
    // IMPT: these need to run AFTER loadUser (in auth app, on load), for user to display
    // -- not using anymore --
    // app.use(function setLocalTitle(req, res, next) {
    //   res.local('title', 'NewLeafDigital Apps');
    //   next();
    // });


    app.use(function setPlaceholderMeta(req, res, next) {
      res.local('meta_description', '');
      next();
    });


    // set app-level body class, etc
    app.use(function setAppInfo(req, res, next) {
      // res.bodyClass = res.bodyClass || [];    // keep if already created
      // res.bodyClass.push('app-hq');

      res.bodyClass = [ 'app-hq' ];
      res.activeApp = 'hq';

      next();
    });


    // load messages (not using express-messages here, just plain, w/ .alert-message)
    app.use(function getMessages(req, res, next) {
      res.local('messages', req.flash());
      next();
    });


    // load parent app's routes now. 
    // ** MUST run __after__ auth loads, otherwise INDIVIDUAL ROUTE MIDDLEWARE FROM AUTH TAKE PRECEDENCE OVER GLOBAL MIDDLEWARE HERE!!
    app.use(app.router);


    // MOUNT AUTH APP at sub-path. auto-namespaces paths at sub.
    //app.use('/auth', auth);
    // --CHANGED: auth paths should be global, make sure apps don't overlap.
    app.use(auth);


    var sharedDynamicHelpers = {
      // messages: messages,   // populate w/ req.flash()

      bodyClass: function(req, res) {
        return _.isUndefined(res.bodyClass) ? '' : res.bodyClass.join(' ');
      },

      // for top nav, which app is active
      activeApp: function(req, res) {
        return _.isUndefined(res.activeApp) ? null : res.activeApp;
      },

      // expose conf to views.
      // - was originally just googleAnalyticsId.
      // -- tried that as a static helper, but then whole function got passed to sub-apps as JS string!
      // -- (also tried to render partial via res.partial() to a 'local', but didn't work)
      conf: function(req, res) {
        return app.conf;
      },

      fullUrl: function(req, res) {
        // (is there a built-in way?)
        return 'http://' + req.headers.host + req.originalUrl;
      }
    };
    app.dynamicHelpers(sharedDynamicHelpers);
    // auth.dynamicHelpers(sharedDynamicHelpers);


    // static helpers - make static vars available to views
    // app.sharedStaticHelpers = {
    // };
    // app.helpers(app.sharedStaticHelpers);


    // load Flashcards app too
    // (async / doesn't wait)
    var flashcards = require('./flashcards/flashcards.js');
    app.use('/flashcards', flashcards);


    // load Interactive Lists app
    // (async / doesn't wait)
    var lists = require('./lists/lists.js');
    app.use('/lists', lists);


    // share loaded dynamic helpers w/ sub-apps
    // (necessary after switching to inherited templates)
    auth.dynamicHelpers(app.dynamicViewHelpers);
    flashcards.dynamicHelpers(app.dynamicViewHelpers);
    lists.dynamicHelpers(app.dynamicViewHelpers);

    // auth.dynamicHelpers(app.sharedStaticHelpers);
    // flashcards.dynamicHelpers(app.sharedStaticHelpers);
    // lists.dynamicHelpers(app.sharedStaticHelpers);


    /*
    // test another sub-app for inheritance testing
    var fakeApp = express.createServer();
    fakeApp.get('/fake', function(req, res) { res.end('fake sub-app loaded'); });
    app.use(fakeApp);
    */


    // Routes
    require('./routes/index')(app);

    // // tmp
    // if (_.isUndefined(auth.UserSchema)) {
    //   console.error("AUTH MISSING USER SCHEMA");
    // }


    // user admin
    require('./routes/admin-users')(app, auth.UserSchema);


    // error handling
    // [NOT WORKING YET]
    // -- this caught a mongo error in app.param()
    // @todo make error handling work, 404.jade, etc
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
      app.listen(app.conf.port, app.conf.hostname);

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

  }); // auth app callback
  
}); // db connection callback
