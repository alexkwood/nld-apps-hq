// socket handling for Lists
// @todo namespace sockets using .of('/lists') ?
// note escape item names for bad strings

module.exports = function(app, io) {

  var parseCookie = require('express/node_modules/connect').utils.parseCookie;   // simpler way?

  var _ = require('underscore')
    , List = app.db.model('List')
    , async = require('async');
  

  // get the username of a socket [via session info set in socket 'authorization' below]
  function getSocketUsername(socket) {
    if (! _.isUndefined(socket.handshake.username)) {
      if (! _.isEmpty(socket.handshake.username)) {
        return socket.handshake.username;
      }
    }
    return '[no name]';
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
  

  // find the users viewing a list, return usernames
  // for 'have-users' client event
  function getListRoomUsernames(listId) {
    var usernames = []
      , user = null
      , room = getListRoom(listId);
    
    if (room) {
      // console.log('room for list ', listId, room);
      _.each(room, function(socket) {
        usernames.push( getSocketUsername(socket) );
      });   
    }
    
    // console.log('got usernames:', usernames);
    return usernames;
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
  

  global.socketCounter = 0;    // [total]

  // track sockets connected to each list
  // assign as listId : [ sockets ]
  // @todo eliminate this?
  var listWatchers = {};


  // make sure connecting sockets have a valid express/mongo/everyauth session!
  // (then use that session to pull username)
  // (session integration w/ help from http://www.danielbaulig.de/socket-ioexpress/)
  io.set('authorization', function (data, accept) {
    // console.log('socket auth:', data);
    
    // (control flow, allows break at any async point)
    async.series([
     function(next) {
       if (data.headers.cookie) {
         data.cookie = parseCookie(data.headers.cookie);
         data.sessionID = data.cookie['connect.sid'];      // [not express.sid]
         return next();
       }
       else {
         return next(new Error("Missing cookie"));
       }
     },
     
     function(next) {
       // load the connect-mongo session store from parent app
       if (app.parent && app.parent.sessionStore) {
         var ss = app.parent.sessionStore;
       }
       else {
         return next(new Error("Missing session store!"));
       }

       ss.get(data.sessionID, function onGetSession(error, session) {
         // console.log('get session from store: ', error, session);

         if (error) return next(new Error("Session error"));
         else if (!session) return next(new Error("Invalid session"));

         data.session = session;
         // console.log('got session', data.session);
         
         next();  // (accept)

       });  //onGetSession       
     },
     
     function(next) {
       
       // @todo pull the user info from everyauth for this session!
       // User model set in auth app, plugged into parentApp
       var User = app.db.model('User');
       if (! User) {
         return next(new Error("Unable to access user list"));
       }
       
       // [does this stop if any condition fails, or throw fatal error?]
       if (!data.session.auth || !data.session.auth.userId) {
         return next(new Error("Session missing auth credentials"));
       }
       
       User.findById(data.session.auth.userId, function (error, user) {
         if (error) return next(new Error("Auth error"));
         else if (!user) return next(new Error("Invalid user"));

         data.user = user;
         
         // visible name (defined in model's methods)
         data.username = user.displayName();

         // console.log('user in socket session found in DB, username:', data.username);

         next();
       });
     }
    ],
    
    // series end
    function(error, results) {
      if (error) {
        console.error("Socket auth error:", error);
        accept('Not authorized', false);   // @todo make sure client JS handles this event!!
      }
      else accept(null, true);
    }
    );
  });


  io.sockets.on('connection', function (socket) {
    // console.log('new socket:', socket);
    console.log("socket connection #" + (++global.socketCounter) + ' by', socket.handshake.username);


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
      socket.emit('message', "Hello " + getSocketUsername(socket)  + "!");
      
      joinListRoom(socket, listId);
      broadcastToListRoom(
        listId,
        'message',
        getSocketUsername(socket) + " is now viewing this list.",
        socket
      );
      
      broadcastToListRoom(
        listId,
        'have-users',
        [ getSocketUsername(socket) ],
        socket
      );
    });


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
        broadcastToListRoom(item.listId, 'message', getSocketUsername(socket) + " added " + item.name + " to the list.", socket);
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
        broadcastToListRoom(item.listId, 'message', getSocketUsername(socket) + " removed " + item.name + " from the list.", socket);
        broadcastToListRoom(item.listId, 'item-removed', [ item.name ], null);    // also to sender
      });
      
    }); //remove-item


    // user requests all items in the list
    socket.on('get-items', function(listId) {

      // (only need the items)
      List.findById(listId, ['items'], function(error, list) {
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
      console.log("user %s disconnected", getSocketUsername(socket));
    
      // only broadcast to this socket's rooms
      if (! _.isUndefined(io.roomClients[socket.id])) {
        
        _.each(io.roomClients[socket.id], function(inRoom, roomKey, list) {
          console.log('--- room: ', roomKey, inRoom);
          
          // 1) skip default room '', 2) check inRoom==true (probably redundant)
          if (roomKey != '' && inRoom == true) {
            // note: roomKey here is raw, not just listId (so don't use broadcastToListRoom).
            io.sockets.in(roomKey).emit('message', getSocketUsername(socket) + ' left.');
            io.sockets.in(roomKey).emit('user-removed', getSocketUsername(socket));
          }
        });
      }
    });


    //console.dir(io.sockets.sockets);
    
  }); // on connection
  
};  //module