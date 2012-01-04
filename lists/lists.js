/**
 * interactive shopping list
 */

var util = require('util')
  , express = require('express')
  //, routes = require('./routes')  // (don't need yet)
  , _ = require('underscore');

var app = module.exports = express.createServer()
  , io = require('socket.io').listen(app);

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({ secret: "shopping" }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


app.get('/', function(req, res){
  res.render('index', { title: 'Interactive Shopping List' })
});


// @todo make this part of class prototype?
function getSocketNickname(socket) {
  if (! _.isUndefined(socket.nickname)) {
    if (! _.isNull(socket.nickname) && socket.nickname != "") {
      return socket.nickname;
    }
  }
  return 'Someone';  //fallback
}

function getUsers() {
  var nicknames = [];
  _.each(io.sockets.sockets, function(socket) {
   nicknames.push( getSocketNickname(socket) );
 }); 
 console.log('got users:', nicknames);
 return nicknames;
}

var listItems = [];

var counter = 0;

io.sockets.on('connection', function (socket) {
  //console.log('new socket:', socket);
  console.log("connection #" + (++counter));

  // convention: 'message' types are strings, 'info' are objects', 'todo' are objects
 
  // demos the ways to distribute a message
  socket.on('message', function(msg){
    socket.broadcast.emit('message', 'someone else says: ' + msg);
    socket.emit('message', 'you said: ' + msg);
    io.sockets.emit('message', 'someone said: ' + msg);
  });

  // when client uses socket.send(), server callback only gets 1 val (object),
  // but socket.emit() from client passes separate params into callback

  socket.on("info", function(key, val) {
    console.log("got info: ", key, val);
    socket.set(key, val);

    if (key == 'nickname') {
      socket.nickname = val;
      var nickname = getSocketNickname(socket);
      
      socket.emit('message', "Hello " + nickname + "!");

      socket.broadcast.emit('message', nickname + ' connected');
      socket.broadcast.emit('have-users', [ nickname ]);  // redundant for new user

      
      /*
      // long form
      socket.get('nickname', function (err, nickname) {
        if (err) socket.emit('error: ' + util.inspect(err));
        else {
          socket.emit('message', "Hello " + nickname + "!");
          socket.broadcast.emit('message', nickname + ' connected');
        }
      });
      */     
    }
  });
  

  // user adds a new item
  socket.on('add-item', function(item) {
    socket.emit('message', "Acknowledged your " + item);
    socket.broadcast.emit('message', getSocketNickname(socket) + " added " + item + " to the list.");

    listItems.push(item);
    io.sockets.emit('have-items', [ item ]);
  });

  // user removes an item
  socket.on('remove-item', function(item) {
    // remove from array
    var ind = _.indexOf(listItems, item);
    if (ind == -1) return;
    listItems.splice(ind, 1);

    socket.broadcast.emit('message', getSocketNickname(socket) + " removed " + item + " from the list.");
    io.sockets.emit('item-removed', item);
  });

  // user requests all items in the list
  socket.on('get-items', function() {
    socket.emit('have-items', listItems);
  });

  // user requests all users
  socket.on('get-users', function() {
    socket.emit('have-users', getUsers());
  });

  socket.on('disconnect', function() {
    console.log("user disconnected", arguments);
    io.sockets.emit('message', getSocketNickname(socket) + ' disconnected.');
    io.sockets.emit('user-removed', getSocketNickname(socket));
  });

  //console.dir(io.sockets.sockets);
});


app.listen(3000);
console.log("Express server listening"); // on port %d in %s mode", app.address().port, app.settings.env);
