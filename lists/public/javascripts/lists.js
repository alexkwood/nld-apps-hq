/** client-side socket handling **/

(function(){
  window.app = app = {};

  $(function() {
    $('#new-item #item').focus();
  });

  app.msgCount = 0;
  app.putMsg = function(msg, type) {
    app.msgCount++;
    var div = $('<div></div>');
    div.addClass('message');
    div.attr('id', 'message-' + app.msgCount);
    if (typeof type != "undefined") div.addClass(type);

    div.text(msg);
    $('#messages').append(div);

    // fade out message
    setTimeout(function() {
      //console.log('removing div ' + $(div).attr('id'));
      $(div).slideUp('slow', function() {
        $(div).remove();
      });
    }, 5000);
  };
 
  var nickname = "";

  var socket = app.socket = io.connect( document.location.origin );

  if (nickname == "") nickname = prompt("What's your name?");
  if (nickname == "") nickname = "The nameless one";

  socket.on('connect', function() {
    //console.log('connect', arguments);
    app.putMsg("Connected.");

    socket.emit("info", "nickname", nickname);

    // reset list. impt if server disconnects & reconnects.
    $('#list .item').remove();
    socket.emit("get-items");

    $('#users .user').remove();
    socket.emit("get-users");
  });


  // server response to 'get-items'
  socket.on('have-items', function(items) {
    try {
      if (typeof items.length == "undefined") {
        app.putMsg("Got invalid items", 'error');
        return;
      }

      for(var i = 0; i < items.length; i++) {
        var newItem = $('<div class="item"><input type="checkbox" /><label>' + items[i] + '</label></div>');
        $('#list').append(newItem);
      }
    }
    catch(e) {
      app.putMsg("Error getting items: " + e.message, 'error');
    }
  });

  // server response to 'get-users'
  // @todo this mostly duplicates get-items, consolidate
  socket.on('have-users', function(users) {
    try {
      if (typeof users.length == "undefined") {
        app.putMsg("Got invalid users", 'error');
        return;
      }

      for(var i = 0; i < users.length; i++) {
        var newUser = $('<div class="user">' + users[i] + '</div>');
        if (users[i] == nickname) newUser.addClass('current');
        $('#users').append(newUser);
      }
    }
    catch(e) {
      app.putMsg("Error getting users: " + e.message, 'error');
    }
  });



  // notified by server that any user removed an item
  socket.on('item-removed', function(itemToRemove) {
    //console.log('caught item-remove for ', itemToRemove);
    $('#list .item').each(function(ind, itemInList) {
      if ($(itemInList).find('label').text() == itemToRemove) {
        $(itemInList).slideUp().remove();
        return false;  // break
      }
    });
  });

  // notified by server that a user logged out
  // @todo consolidate this logic into 'item-removed'
  socket.on('user-removed', function(itemToRemove) {
    $('#users .user').each(function(ind, itemInList) {
      if ($(itemInList).text() == itemToRemove) {
        $(itemInList).slideUp().remove();
        return false;  // break
      }
    });
  });


  socket.on('disconnect', function() {
    app.putMsg("Goodbye.");
  });

  socket.on('message', function (data) {
    app.putMsg(data);

    //console.log('message:', data);
  });

  
  $('form#new-item').live('submit', function(event) {
    try {
      var itemToAdd = $('input#item').val();
      //console.log("Adding:", itemToAdd);

      if (itemToAdd == "") {
        app.putMsg("Can't add an empty item", 'error');
      }
      else {
        socket.emit('add-item', itemToAdd);
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
    socket.emit('remove-item', itemToRemove);
  });

})();


