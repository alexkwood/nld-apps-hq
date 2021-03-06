// IMPT: w/ inherited templates, have to make views relative to root for extended layouts (w/partials) to work.
// (this makes app no longer function stand-alone)

module.exports = function(app) {

  // require('express-mongoose');          // NOT USING ANYMORE
  
  var List = app.db.model('List')
    , _ = require('underscore')
    , async = require('async')    // instead of express-mongoose
    ;


  // middleware to ensure user is the creator of a list
  function restrictToCreator(req, res, next) {
    // just in case
    if (!req.list || !req.user) {
      console.error("restrictToUser called without list or user!", req.list, req.user);
      return next(new Error("Something is missing"));
    }
    
    var check = req.list.isCreator(req.user._id);
    console.log("in restrictToCreator:", req.list._creator._id, req.user._id, 'match?', check);
    
    if (! check) next(new Error("Unauthorized!"));
    else next();
  }
  


  // // load messages (not using express-messages here, just plain)
  // // -- don't need anymore, parent app puts messages in layout.jade
  // app.use(function(req, res, next) {
  //   res.local('listsMessages', req.flash());
  //   next();
  // });

  // meta description for lists pages
  app.use(function setListsMetaDesc(req, res, next) {
    res.local('meta_description', 'Shared Real-Time Lists app by New Leaf Digital, built in node.js. '
      + 'Create to-do lists, shopping lists, or any other kinds of list, share with friends, and view changes in real time.');
    next();
  });


  // when this is invoked, any new app.use() middleware goes AFTER routes run, too late.
  // (probably redundant to load at all)
  app.use(app.router);
  

  // gets redirected here from restrictUser
  app.get('/login', function(req, res){
    res.render('lists/login', {
      locals: {
        title : 'Login'
      }
    });
  });
  


  // given a :listId object in a route, load the list into request
  app.param('listId', app.restrictUser, function(req, res, next, listId) {
    req.list = List.findById(listId)
    .populate('_creator')     // async from Users. (see comments in model)
      // [don't need to .populate('_guests') b/c never pulling guest info other than _id]
    .run(function(error, list) {
      // console.log('getById response:', error, list);
      if (error) return next(error);
      if (! list) return next(new Error("Unknown list!"));

      // make available to routes
      req.list = list;

      // console.log('HAVE JOINED USER?', req.list);
      // console.log('displayName()?', req.list._creator.displayName());

      // user is viewing this list -- assume user is either the creator, or has been given the URL by the creator.
      // so if it's not the creator, add it to the 'guests' list.
      if (! list.isCreatorOrGuest(req.user._id)) {
        console.log('ADDING user ', req.user.displayName(), ' to the guests list of ', list.title);
        list._guests.push( req.user._id );
        list.save(function(){
          next();
        });
      }
      else {
        next();
      }
    });
  });
  
  
  // HELPER: load user's lists (own and guest)
  // needed for /list/:listId and /, consolidating.
  // previously loaded w/ express-mongoose in each route.
  function getAllUserLists(req, res, next) {
    console.log(' -- in getAllUserLists --');
    async.series([
      function(seriesNext) {
        List.getListsCreatedByUser(req.user._id, (req.list ? req.list._id : null), function(error, yourLists) {
          res.local('yourLists', error ? [] : yourLists);
          seriesNext();
        });
      },
      function(seriesNext) {
        List.getListsVisitedByUser(req.user._id, (req.list ? req.list._id : null), function(error, guestLists) {
          res.local('guestLists', error ? [] : guestLists);
          seriesNext();
        });
      },
      function(seriesNext) {
        next();
      }
    ]); //series    
  }
  

  // view an individual list
  app.get('/list/:listId', app.restrictUser, getAllUserLists, function(req, res) {
    res.render('lists/list', {
      // title: req.list.title,
      
      // [previous from express-mongoose -- now using middleware above]
      //yourLists: List.getListsCreatedByUser(req.user._id, req.list._id),
      //guestLists: List.getListsVisitedByUser(req.user._id, req.list._id),

      currentList: req.list,
      userIsListCreator: req.list.isCreator(req.user._id)
    });
  }); //.get


  // delete an individual list
  // only author can delete!
  app.get('/list/:listId/delete', app.restrictUser, restrictToCreator, function(req, res) {        
    req.list.remove(function(error){
      if (error) req.flash('error', 'Error deleting the list.');
      else req.flash('info', 'Deleted the list ' + req.list.title);
        // @todo allow html (e.g. <em>) to work in req.flash
      
      res.redirect('/');
    });
  });
  
  
  // create a new list
  app.post('/list/new', app.restrictUser, function(req, res) {
    
    var newListName = req.body.list_name;     // [seems to escape injections already?]
    if (_.isEmpty(newListName)) {
      req.flash('error', 'Please enter a name for the new list');
      return res.redirect('/');
    }

    var list = new List({
      title: newListName,
      _creator: req.user          // (validated w/ restrictUser)
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
  
  
  // list of lists
  app.get('/', app.restrictUser, getAllUserLists, function(req, res){
    res.render('lists/index', {
      // [see comment above]
      // yourLists: List.getListsCreatedByUser(req.user._id, null),
      // guestLists: List.getListsVisitedByUser(req.user._id, null)
    });
  });
  

};