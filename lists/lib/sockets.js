// socket handling for Lists
// @todo figure out how 'rooms' work in socket.io
// @todo namespace sockets using .of('/lists') ?

module.exports = function(app, io) {

  var _ = require('underscore');
  var List = app.db.model('List');
    
  function getSocketNickname(socket) {
    if (! _.isUndefined(socket.nickname)) {
      if (! _.isNull(socket.nickname) && socket.nickname != "") {
        return socket.nickname;
      }
    }
    return 'Someone';  //fallback
  }

  // @todo this needs to be _per list_
  function getUsers() {
    var nicknames = [];
    _.each(io.sockets.sockets, function(socket) {
     nicknames.push( getSocketNickname(socket) );
   }); 
   console.log('got users:', nicknames);
   return nicknames;
  }

  // @todo remove this, use DB
  var listItems = [];

  // @todo remove?
  var counter = 0;

  // track sockets connected to each list
  // assign as listId : [ sockets ]
  var listWatchers = {};

  io.sockets.on('connection', function (socket) {
    // console.log('new socket:', socket);
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


    // detect which list a user is watching, join that 'room'
    // list rooms namespaced w/ 'list:ID'
    socket.on('list:watch', function(listId) {
      socket.join('list:' + listId);
    });


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
    // (item contains 'name' and 'listId')
    socket.on('add-item', function(item) {
      // @todo eliminate listItems, go to DB
      listItems.push(item.name);

      socket.emit('message', "Acknowledged your " + item.name);
      socket.broadcast.to('list:' + item.listId)
        .emit('message', getSocketNickname(socket) + " added " + item.name + " to the list.")
        .emit('have-items', [ item.name ]);
    });

    // user removes an item
    // (item contains 'name' and 'listId')
    socket.on('remove-item', function(item) {
      // remove from array
      var ind = _.indexOf(listItems, item.name);
      if (ind == -1) return;
      listItems.splice(ind, 1);

      socket.broadcast.to('list:' + item.listId)
        .emit('message', getSocketNickname(socket) + " removed " + item.name + " from the list.");
        .emit('item-removed', item.name);
    });

    // user requests all items in the list
    socket.on('get-items', function(listId) {
      // @todo get items for list # listId
      socket.emit('have-items', listItems);
    });

    // user requests all users watching a given list
    socket.on('get-users', function(listId) {
      // @todo return usernames in the list _room_
      socket.emit('have-users', getUsers());
    });

    socket.on('disconnect', function() {
      console.log("user disconnected", arguments);
      // @todo only broadcast to this socket's rooms!
      io.sockets.emit('message', getSocketNickname(socket) + ' disconnected.');
      io.sockets.emit('user-removed', getSocketNickname(socket));
    });

    //console.dir(io.sockets.sockets);
  });
  
};