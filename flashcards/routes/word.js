// routes: /word/*

/*
new url structure:
- /word/add
- /word/list
- /word/:word (view)
- /word/:word/edit
- /word/:word/delete
*/


// app passed as closure
module.exports = function(app){

  // all DB handling goes thru model
  var WordHandler = require('../models/word.js');     // don't use 'Word' name to avoid confusion
  var util = require('util');
  var _ = require('underscore')._;

  
  // called on route handlers for /word/add, /word/edit
  var getGroups = function(db, query, currentWord, callback) {
    WordHandler.getGroups(db, query, function(error, groups) {
      if (error) {
        return callback(error);
      }

      groups = _.filter(groups, function(value){    // strip empties
        return ! _.isEmpty(value);
      });
      
      groups = _.map(groups, function(value) {
        map = { key: value, value: value, selected: false };
        if (!_.isUndefined(currentWord.group)) {
          if (currentWord.group == value) map.selected = true;
        } 
        return map;
      });
      
      callback(null, groups);
    });
  };
  

  // process :word param when passed
  // [how does connectDb middleware work here?]
  app.param('word', app.restrictUser, function(req, res, next, id){
    console.log('*** track word ID for /word/* routes:', req.wordId);

    WordHandler.getById(app.legacyDB, id, function(error, word) {
      if (error) {
        
        // @TODO THIS NEEDS TO HANDLE INVALID ID'S!!
        
        req.flash('error', util.inspect(error));    // [added]
        return next(error);      // what does this do?
      }

      // make sure word is owned by current user!!      
      if (_.isEmpty(word.user) || word.user !== app.username(req)) {
        req.flash('That word is not owned by the current user!');
        res.redirect('back');
        return;
      }
      
      // all ok, assign to req
      req.word = new WordHandler(word);
      // console.log('matched word: ', req.word);
      
      next();     // continues to router?
    });
  });
  
  
  app.get('/word', /*app.restrictUser,*/ function(req, res) {
    console.log('at ', req.url, 'redirect to /word/list');
    res.redirect('/word/list');
  });
  


  app.get('/word/list', app.restrictUser, function(req, res) {    
    var query = {};
    var pageTitle = 'List';
    
    // limit to current user!
    query.user = app.username(req);
    
    // filters?
    if (!_.isUndefined(req.query.group)) {
      query.group = req.query.group;
      pageTitle = 'Words in group &quot;' + req.query.group + '&quot;';
    }
    
    WordHandler.getWords(app.legacyDB, query, function(error, words) {
      if (error) {
        req.flash('error', "Error: " + util.inspect(error));
        res.redirect('back');
      }
      else {
        // console.log('words:', words);
        
        res.render('flashcards/word/list', {
          pageTitle: pageTitle,
          words: words,
          showWordLinks: true,
          activeNav: 'list'
        });
      }
    });
  });
  
  
  app.get('/word/add', app.restrictUser, function(req, res) {
    var word = new WordHandler();   //empty
    
    // prepopulate from querystring? (used from /lookup results)
    if (!_.isUndefined(req.query.word_es) || !_.isUndefined(req.query.word_en)) {
      word = new WordHandler(req.query);
    }
    
    // get groups. was using EventEmitter here, but it kept throwing a "Can't use mutable header APIs after sent" error.
    getGroups(app.legacyDB, 
      { 'user': app.username(req) },
      {},   //current
      function(error, groups){
      if (error) {
        req.flash('error', "Unable to get groups. " + util.inspect(error));
        res.render('flashcards/home', { 
          locals: { 
            pageTitle : '',
            activeNav: 'add'
          }
        });
        return;
      }
      
      res.render('flashcards/word/form', {
        locals: {
          word: word,
          pageTitle: 'Add a Word',
          action: '/word',

          // for dropdown
          types: _.map(WordHandler.getWordTypes(), function(value, key) {
            return { 
              key: key, 
              value: value, 
              selected: _.isUndefined(req.query.type) ? false : (req.query.type == key)
            };
          }),
          
          groups: groups,
          
          activeNav: 'add'
        }
      });
    });
  });

  
  
  app.get('/word/:word/edit', app.restrictUser, function(req, res) {
    
    getGroups(app.legacyDB, 
      { 'user': app.username(req) },
      req.word,
      function(error, groups) {
        if (error) {
          req.flash('error', "Unable to get groups. " + util.inspect(error));
          res.render('flashcards/home', { locals: { pageTitle : '' } });
          return;
        }
      
        res.render('flashcards/word/form', {
          locals: {
            word: req.word,   // from app.param()
      
            action: '/word/' + req.word._id,
      
            pageTitle: 'Edit Word',
      
            // for dropdown
            types: _.map(WordHandler.getWordTypes(), function(value, key) {
              return { 
                key: key,
                value: value,
                selected: (req.word.type == key)
              };
            }),
          
            groups: groups,
            
            activeNav: 'list'
          }
        });
      
    });
  });
  

  // after all the fixed /word/X, assume X is an ID.
  // @todo don't restrict these 'permalinks' to user -- but then make showWordLinks dependent on user!
  app.get('/word/:word', app.restrictUser, function(req, res) {
    // 'list' view includes styles, 'word' is a partial.
    res.render('flashcards/word/list', {
      locals: {
        words: [ req.word ],
        pageTitle: '',
        showWordLinks: true
      }
    });
  });
  
  
  // save a new or updated word (or return to form if validation failed.)
  // using POST for create & update; some use PUT, seems controversial/not that important.
  app.post('/word/:word?', app.restrictUser, function(req, res) {
    // console.log('params:', req.body);

    // start w/ empty, or existing.
    if (_.isUndefined(req.word)) {
      var originalWord = new WordHandler({
        // (user only goes on NEW, leave alone if existing. in theory allows admin editing.)
        'user': app.username(req)
      });
    }
    else {
      var originalWord = req.word;
    }

    // pull new values from POST request (only partial).
    var updatedWord = req.body;
    
    // update/fill.
    updatedWord = _.extend(originalWord, updatedWord);
    console.log('original word:', originalWord);
    console.log('updated word:', updatedWord);
    
    // map to model. cleans up new_group, etc.
    updatedWord = new WordHandler(updatedWord);
    console.log('modeled word:', updatedWord);
    
    // save if validates.
    updatedWord.validate(function(error) {
      if (error) {
        req.flash('error', error.message);
        return res.redirect('back');
      }
      
      updatedWord.save(app.legacyDB, function(error){
        if (error) {
          console.log("Error on save: %j", error);
          return next(error);    // ??
        }

        req.flash('info', "Successfully updated word '" + updatedWord.word_en + "' / '" + updatedWord.word_es + "'");

        console.log('at ', req.url, 'redirect to /word/list');
        res.redirect('/word/list');
      });
      
    });
  });
  
  
  app.get('/word/:word/delete', app.restrictUser, function(req, res) {
    console.log('deleting:', req.word);
    WordHandler.remove(app.legacyDB, req.word._id, function(error) {
      if (error) {
        req.flash('error', error.message);
        return res.redirect('back');
      }
      req.flash('info', "Successfully deleted word '" + req.word.word_en + "' / '" + req.word.word_es + "'");
      res.redirect('/word/list');
    });
  });
  
};