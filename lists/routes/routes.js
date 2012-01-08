module.exports = function(app) {

  require('express-mongoose');
  var List = app.db.model('List')
    , _ = require('underscore');

  // middleware to ensure logged in
  // @todo ...?

  app.param('listId', app.restrictUser, function(req, res, next, listId) {
    req.list = List.findById(listId, function(error, list) {
      // console.log('getById response:', error, list);
      if (error) return next(error);
      if (! list) return next(new Error("Unknown list!"));
      
      req.list = list;
      
      next();
    });
  });
  
  
  // @todo REFACTOR so list is here, not at index!
  app.get('/list/:listId', app.restrictUser, function(req, res) {
    res.render('list', {
      // title: req.list.title,
      lists: List.getLists(),
      list: req.list
    });
  });


  // @todo restrict to author!
  app.get('/list/:listId/delete', app.restrictUser, function(req, res) {        
    req.list.remove(function(error){
      if (error) req.flash('error', 'Error deleting the list.');
      else req.flash('info', 'Deleted the list <em>' + req.list.title + '</em>');
      
      res.redirect('/');
    });
  });
  

  app.get('/login', function(req, res){
    res.render('login', {
      locals: {
        title : 'Login'
      }
    });
  });
  
  
  app.post('/list/new', app.restrictUser, function(req, res) {
    
    var newListName = req.body.list_name;
    if (_.isEmpty(newListName)) {
      req.flash('error', 'Please enter a name for the new list');
      return res.redirect('/');
    }

    var list = new List({
      title: req.body.list_name,
      created_by: 'someone'      // @todo!!
    });
    
    list.save(function(error, list) {
      if (error) {
        req.flash('error', "An error occurred saving your new list (" + error + ")");
        res.redirect('/');
      }
      else {
        req.flash('info', "Added the new list!");
        res.redirect('/list/' + list._id);
      }      
    });
  });
  
  

  app.get('/', app.restrictUser, function(req, res){
    res.render('index', {
      lists: List.getLists()
    });
  });
  

};