/** client-side Lists: socket handling, etc **/

(function($){
  var app = window.ListsApp = {};

  app.username = null;
  
  app.msgCount = 0;
  app.putMsg = function(msg, type) {
    app.msgCount++;
    var div = $('<div></div>');
    div.addClass('message');
    div.attr('id', 'message-' + app.msgCount);
    if (typeof type != "undefined") div.addClass(type);

    div.text(msg);
    $('#messages').append(div);
    fadeMessage(div);
  };
  
  // start a 15-second fade countdown on a message
  var fadeMessage = function(div) {
    // console.log('starting fade on', div);
    setTimeout(function() {
      $(div).slideUp('slow', function() {
        $(div).remove().die();
      });
    }, 15000);
  };
  
  
  // initialize on doc ready
  $(function() {
    $('#new-item #item').focus();
    
    // allow event catchers to grab/manipulate this app
    // -- 'loaded-app' notifies doc that app is ready,
    // -- doc then passes back 'watch-list' ID
    // (not sure what obj to run this event on, using window for now)
    $(window)
    .on('set-username', function(event, username) {
      app.username = username;
    })
    .on('watch-list', function(event, listId){
      app.watchList(listId);
    })
    .trigger('loaded-app', app);
    
    
    $('a.delete-list').click(function(event) {
      if (! confirm('Are you sure you want to delete this list?')) {
        event.preventDefault();
        return false;
      }
    });
    
    // apply fades to initial (static html) messages
    $('#messages .message').each(function(ind, div) {
      fadeMessage(div);
    });    
    
  }); // ready
  

  
  // loads a socket to watch/handle an individual list.
  // triggered on 'watch-list' event below.
  app.watchList = function(listId) {
    app.listId = listId;
    
    // socket on same host
    app.socket = io.connect( document.location.origin );
    
    app.socket.on('connect', function() {
      //console.log('connect', arguments);
      app.putMsg("Connected.");

      // join room
      app.socket.emit('list:watch', app.listId);

      // reset list. impt if server disconnects & reconnects.
      $('#list .item').remove();
      app.socket.emit("get-items", app.listId);

      $('#users .user').remove();
      app.socket.emit("get-users", app.listId);
    });


    // server response to 'get-items'
    app.socket.on('have-items', function(items) {
      try {
        if (typeof items.length == "undefined") {
          app.putMsg("Got invalid items", 'error');
          return;
        }

        for(var i = 0; i < items.length; i++) {
          var newItem = $('<div class="item"><input type="checkbox" /><label>' + items[i] + '</label></div>');
          $('#list').append(newItem);
        }
        
        app.toggleNoItemsMessage();
      }
      catch(e) {
        app.putMsg("Error getting items: " + e.message, 'error');
      }
    });

    // server response to 'get-users'
    // @todo this mostly duplicates get-items, consolidate
    app.socket.on('have-users', function(users) {
      try {
        if (typeof users.length == "undefined") {
          app.putMsg("Got invalid users", 'error');
          return;
        }

        for(var i = 0; i < users.length; i++) {
          var newUser = $('<div class="user">' + users[i] + '</div>');
          if (app.username && users[i] == app.username) newUser.addClass('current');
          $('#users').append(newUser);
        }
      }
      catch(e) {
        app.putMsg("Error getting users: " + e.message, 'error');
      }
    });



    // notified by server that any user removed an item
    app.socket.on('item-removed', function(itemToRemove) {
      //console.log('caught item-remove for ', itemToRemove);
      $('#list .item').each(function(ind, itemInList) {
        if ($(itemInList).find('label').text() == itemToRemove) {
          $(itemInList).slideUp().remove();
          return false;  // break
        }
      });
      
      app.toggleNoItemsMessage();
    });

    // notified by server that a user logged out
    // @todo consolidate this logic into 'item-removed'
    app.socket.on('user-removed', function(itemToRemove) {
      $('#users .user').each(function(ind, itemInList) {
        if ($(itemInList).text() == itemToRemove) {
          $(itemInList).slideUp().remove();
          return false;  // break
        }
      });
    });


    app.socket.on('disconnect', function() {
      app.putMsg("Goodbye.");
    });

    app.socket.on('message', function (data) {
      app.putMsg(data);
      //console.log('message:', data);
    });
    
    
    // form works w/ sockets
    $('form#new-item').live('submit', function(event) {
      try {
        var itemToAdd = $('input#item').val();
        //console.log("Adding:", itemToAdd);

        if (itemToAdd == "") {
          app.putMsg("Can't add an empty item", 'error');
        }
        else {
          app.socket.emit('add-item', {
            listId: app.listId,
            name: itemToAdd
          });
        }
      } catch(e) {
        app.putMsg('error: ' +  e.message, 'error');
      }

      $('input#item').val("");

      event.preventDefault();
      return false; // don't submit form
    });

    $('#list .item input[type="checkbox"]').live('click', function(event){
      var itemToRemove = $(this).next('label').text();
      app.socket.emit('remove-item', {
        name: itemToRemove,
        listId: app.listId
      });
    });
    
  };  // watchList
  
  app.toggleNoItemsMessage = function() {
    // toggle no-items message
    if ($('#list .item').size()) $('#no-items').hide();
    else $('#no-items').show();
  };

})(jQuery);


