
module.exports = function(app) {

  require('express-mongoose');
  var List = app.db.model('List');

  // middleware to ensure logged in
  

  app.param('listId', app.restrictUser, function(req, res, next, listId) {
    req.list = List.findById(listId, function(error, list) {
      console.log('getById response:', error, list);
      if (error) return next(error);
      if (! list) return next(new Error("Unknown list!"));
      
      req.list = list;
      
      next();
    });
  });
  
  
  // @todo REFACTOR so list is here, not at index!
  app.get('/list/:listId', app.restrictUser, function(req, res) {
    res.render('list', {
      title: req.list.title,
      lists: List.getLists(),
      list: req.list
    });
  });
  

  app.get('/', app.restrictUser, function(req, res){
    res.render('index', {
      lists: List.getLists()
    });
  });

};