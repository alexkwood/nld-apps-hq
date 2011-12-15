// HQ app. central layer on top of auth and sub-apps.

var express = require('express')
  , routes = require('./routes')
  , _ = require('underscore')
  ;

// this is the PARENT app
var app = module.exports = express.createServer();

// load conf. (each child app might have its own conf.)
app.conf = require('./conf');
console.log('parent conf: ', app.conf);


// populate DB [fresh] -- using lib in auth submod
require('./auth/lib/db')(app, module, 'hq'); //3rd param for logging

// same w/ sessionStore
require('./auth/lib/sessionStore')(app, module, 'hq');



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
//auth.set('basepath', '/auth');
app.use('/auth', auth);  // automatically namespaces everything at sub-path...?


// middleware, checks if auth module is authenticated
var isAuthAuthed = function(req, res, next) {
  console.log('in isAuthAuthed');

  console.log('user? ', req.user);

  console.log('session? ', req.session);

  //console.dir(req);

  console.log(': ', module.parent);


  next();
};


// Routes

app.get('/', isAuthAuthed, routes.index);



if (! module.parent) {
  app.listen(80);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
else {
  console.log('HQ app has parent, not listening.');
}
