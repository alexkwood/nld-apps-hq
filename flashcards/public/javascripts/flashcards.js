// client-side game JS

$(function(){
  
  $('#play a#show').click(function(event){
    event.preventDefault();
    
    $('#answer').show();
    //$('a#show').hide();
    $('div#show-wrapper').hide();
  });
  
  
  $('.links a.delete').click(function(event) {
    if (! confirm("Sure?") ) {
      event.preventDefault();
      return false;
    }
  });
  
  
  if ($('form#login').size()) {
    $('form#login').find('input.password').focus();
  }


  if ($('form#add-word').size()) {
    var toggleNewGroup = function() {
      if ($('form#add-word select#group').val() == 'new') {
        $('form#add-word input#new_group').show();
      }
      else {
        $('form#add-word input#new_group').hide();
      }
    };
    
    $('form#add-word select#group').bind('change', toggleNewGroup);
    toggleNewGroup();
  }
  
  
  // game keyboard shortcuts
  if ($('body.play').size()) {
    $('#kb-legend').show();

    $(document).keydown(function(event){
        // console.log("keydown:", event.which);
        
        // Enter key shows the answer
        if (event.which === 13) {
          $('a#show').click();
        }
        
        // R restarts
        if (event.which === 82) {
          $(document).unbind('keydown');
          document.location.href = $('a.next-restart').attr('href');
        }
        
        // left arrow: 37
        // click() on link didn't work, use href instead
        if (event.which === 37) {
          $(document).unbind('keydown');
          document.location.href = $('a.next-correct').attr('href');
        }
        
        // right arrow: 39
        if (event.which === 39) {
          $(document).unbind('keydown');
          document.location.href = $('a.next-incorrect').attr('href');
        }
      }
    );
  }
  
});