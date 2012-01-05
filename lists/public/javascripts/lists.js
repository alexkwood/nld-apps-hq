/** client-side socket handling **/

(function($){
  var app = window.app = {};

  /*
  // @todo lookup in jquery docs how to do this. purpose is to pass listId when client app initializes.
  // test custom events
  $(window).on('custom1', function(event){
    alert('caught custom event!');
    console.log(event);
  });
  $(function(){
    $(window).emit('custom1', 'hello');
  });
  */
  
  $(function() {
    $('#new-item #item').focus();
    
    // @todo 'var listId' is silly, should go straight to app when ready
    app.listId = typeof listId != "undefined" ? listId : null;
    
    
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

    // socket on same host
    var socket = app.socket = io.connect( document.location.origin );

    // @todo this should be passed from server
    // if (nickname == "") nickname = prompt("What's your name?");
    if (nickname == "") nickname = "The nameless one";


    socket.on('connect', function() {
      //console.log('connect', arguments);
      app.putMsg("Connected.");

      // join room
      socket.emit('list:watch', app.listId);

      socket.emit("info", "nickname", nickname);

      // reset list. impt if server disconnects & reconnects.
      $('#list .item').remove();
      socket.emit("get-items", app.listId);

      $('#users .user').remove();
      socket.emit("get-users", app.listId);
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
          socket.emit('add-item', {
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
      socket.emit('remove-item', {
        name: itemToRemove,
        listId: app.listId
      });
    });
    
  }); // ready

})(jQuery);


