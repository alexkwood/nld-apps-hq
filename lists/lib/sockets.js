// socket handling for Lists
// @todo figure out how 'rooms' work in socket.io
// @todo namespace sockets using .of('/lists') ?
// @todo escape item names for bad strings

module.exports = function(app, io) {

  var _ = require('underscore')
    , List = app.db.model('List')
    , async = require('async');
  

  // get the username of a socket
  // @todo refactor this to use sessions, replace 'nickname' with 'username'
  function getSocketNickname(socket) {
    if (! _.isUndefined(socket.nickname)) {
      if (! _.isNull(socket.nickname) && socket.nickname != "") {
        return socket.nickname;
      }
    }
    return 'Someone';  //fallback
  }
  
  
  /*
  rooms ref:
    - io.rooms = array of rooms, key is arbitrary, values are socket IDs (as strings)
    - io.roomClients = list of clients and their rooms [reverse of io.rooms]
    - io.sockets.in().emit() sends to all users in a room
    - socket.broadcast.to().emit() sends to all users in room except _socket_
  */
  
  // key for a list room (namespacing to allow other room types in future)
  function listRoomKey(listId) {
    return 'list:' + listId;
  }
  
  // join an individual socket to a list room
  function joinListRoom(socket, listId) {
    socket.join( listRoomKey(listId) );
  }
  
  // get array of socket IDs in a list room
  function getListRoom(listId) {
    if (!_.isEmpty(listId)) {
      // == crude (just returns socket IDs)==
      // var roomKey = '/list:' + listId;      // (note leading /)
      // if (!_.isUndefined(io.rooms[roomKey])) return io.rooms[roomKey];
      
      // == better (returns socket objects) ==
      var room = io.sockets.in( listRoomKey(listId) );
      if (room && room.sockets) return room.sockets;
    }
    return false;
  }
  

  // passes usernames (aka nicknames) to 'have-users' client event
  // @todo this needs to be _per list_ ... find the _room_ for that list?
  function getListRoomUsernames(listId) {
    var users = []
      , user = null
      , room = getListRoom(listId);
    
    if (room) {
      // console.log('room for list ', listId, room);
      _.each(room, function(socket) {
        users.push( getSocketNickname(socket) );
      });   
    }
    
    //  _.each(io.sockets.sockets, function(socket) {
    //   users.push( getSocketNickname(socket) );
    // });
    console.log('got users:', users);
    return users;
  }
  
  
  // - pass socket to excludeSocket to 'broadcast', otherwise goes to everyone in room
  function broadcastToListRoom(listId, key, value, excludeSocket) {
    var roomKey = listRoomKey(listId);
    if (excludeSocket) {
      excludeSocket.broadcast.to(roomKey).emit(key, value);
    }
    else {
      io.sockets.in(roomKey).emit(key, value);
    }    
  }
  

  // @todo remove?
  var counter = 0;

  // track sockets connected to each list
  // assign as listId : [ sockets ]
  var listWatchers = {};

  io.sockets.on('connection', function (socket) {
    // console.log('new socket:', socket);
    console.log("connection #" + (++counter));

    // convention: 'message' types are strings, 'info' are objects', 'todo' are objects

    /*
    // demos the ways to distribute a message (w/o rooms)
    socket.on('message', function(msg){
      socket.broadcast.emit('message', 'someone else says: ' + msg);
      socket.emit('message', 'you said: ' + msg);
      io.sockets.emit('message', 'someone said: ' + msg);
    });
    */

    // note: when client uses socket.send(), server callback only gets 1 val (object),
    //  but socket.emit() from client passes separate params into callback


    // detect which list a user is watching, join that 'room'
    // list rooms namespaced w/ 'list:ID'
    socket.on('list:watch', function(listId) {
      joinListRoom(socket, listId);
      broadcastToListRoom(
        listId,
        'message',
        getSocketNickname(socket) + " is now viewing this list.",
        socket
      );
      
      broadcastToListRoom(
        listId,
        'have-users',
        [ getSocketNickname(socket) ],
        socket
      );
    });


    /*
    // @todo eliminate this, should get from session instead
    socket.on("info", function(key, val) {
      console.log("got info: ", key, val);
      socket.set(key, val);

      if (key == 'nickname') {
        socket.nickname = val;
        var nickname = getSocketNickname(socket);

        socket.emit('message', "Hello " + nickname + "!");

        socket.broadcast.emit('message', nickname + ' connected');
        socket.broadcast.emit('have-users', [ nickname ]);  // redundant for new user
      }
    });
    */

    // user adds a new item
    // (item contains 'name' and 'listId')
    socket.on('add-item', function(item) {      
      
      List.addItemToList(item.listId, item.name, function(error, list) {        
        if (error) {
          socket.emit('message', "An error occurred adding your " + item.name + " to the list. (" + error + ")");
          return;
        }
        
        // success
        socket.emit('message', "Acknowledged your " + item.name);
        broadcastToListRoom(item.listId, 'message', getSocketNickname(socket) + " added " + item.name + " to the list.", socket);
        broadcastToListRoom(item.listId, 'have-items', [ item.name ], null);    // also to sender        
      });
      
    }); //add-item



    // user removes an item
    // (item contains 'name' and 'listId')
    socket.on('remove-item', function(item) {
      List.removeItemFromList(item.listId, item.name, function(error, list) {
        if (error) {
          socket.emit('message', "An error occurred removing " + item.name + " from the list. (" + error + ")");
          return;
        }
        
        socket.emit('message', "Removed " + item.name);
        broadcastToListRoom(item.listId, 'message', getSocketNickname(socket) + " removed " + item.name + " from the list.", socket);
        broadcastToListRoom(item.listId, 'item-removed', [ item.name ], null);    // also to sender
      });
      
    }); //remove-item


    // user requests all items in the list
    socket.on('get-items', function(listId) {

      List.findById(listId, function(error, list) {
        if (error || !list) {
          socket.emit('message', "Error, can't load items for that list! (" + error + ")");
          return;
        }
        
        socket.emit('have-items', list.items);
      });
    });
    

    // user requests all users watching a given list
    socket.on('get-users', function(listId) {
      socket.emit('have-users', getListRoomUsernames(listId));
    });
    

    socket.on('disconnect', function() {
      console.log("user %s disconnected", getSocketNickname(socket));
    
      // only broadcast to this socket's rooms
      if (! _.isUndefined(io.roomClients[socket.id])) {
        
        _.each(io.roomClients[socket.id], function(inRoom, roomKey, list) {
          console.log('--- room: ', roomKey, inRoom);
          
          // 1) skip default room '', 2) check inRoom==true (probably redundant)
          if (roomKey != '' && inRoom == true) {
            // note: roomKey here is raw, not just listId (so don't use broadcastToListRoom).
            io.sockets.in(roomKey).emit('message', getSocketNickname(socket) + ' left.');
            io.sockets.in(roomKey).emit('user-removed', getSocketNickname(socket));
          }
        });
      }
    });


    //console.dir(io.sockets.sockets);
    
  }); // on connection
  
};  //module