
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , everyauth = require('everyauth')
  , util = require('util');

everyauth.facebook
  .appId('214626601947311')
  .appSecret('c039b7f9b7eeae96b9e406a46777755b')
  //.handleAuthCallbackError( function (req, res) {})
  .findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata) {
    console.log("findOrCreateUser:", util.inspect({'session':session,'accessToken':accessToken,'accessTokExtra':accessTokExtra,'fbUserMetadata':fbUserMetadata}));

    //var promise = this.Promise();

    // needs to return something or else throws a Promise error
    return fbUserMetadata;
  })
  .redirectPath('/');

var app = module.exports = express.createServer();


// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  //app.use(express.methodOverride());

  app.use(express.cookieParser());
  app.use(express.session({secret: 'ab55e616a760d302'}));
  app.use(everyauth.middleware());  

  app.use(app.router);
  app.use(express.static(__dirname + '/public'));

  app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

  everyauth.helpExpress(app);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


// Routes

app.get('/', routes.index);


app.listen(80);
console.log("Express server listening");  // on port %d in %s mode", app.address().port, app.settings.env);
