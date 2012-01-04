// routes: /play/*

module.exports = function(app){
  
  var WordHandler = require('../models/word.js');     // don't use 'Word' name to avoid confusion
  var util = require('util');
  var _ = require('underscore')._;


  // mark a word in the session as played.
  app.logPlayedWord = function(req, wordId) {
    if (_.isUndefined(req.session.playedWords)) {
      req.session.playedWords = [];
    }
    
    req.session.playedWords.push(wordId);
    // console.log("recorded played word:", wordId);
  };

  // get an array of word IDs from the session,
  // for words played SUCCESSFULLY in this match.
  // changed: return mongo ObjectID object, not string
  app.getPlayedWords = function(req) {
    var ids = _.isUndefined(req.session.playedWords) ? [] : req.session.playedWords
      , MongoHandler = require(app.appRoot + '/db/mongodb.js');
    return _.map(ids, MongoHandler.objectID);
  };


  // word param for /play/:wordId/correct. dif from :word in /word/* routes.
  app.param('wordId', function(req, res, next, id){
    // only track the ID, don't need the word obj here.
    req.wordId = id;
    // console.log('*** track word ID for /play/* routes:', req.wordId);
    
    next();
  });

  // mark a word as successfully played.
  app.get('/play/:wordId/correct', app.restrictUser, function(req, res) {
    app.logPlayedWord(req, req.wordId);

    // onto next word
    res.redirect('/play');
  });
  
  
  // doesn't do anything special
  app.get('/play/:wordId/incorrect', app.restrictUser, function(req, res) {
    // onto next word
    res.redirect('/play');
  });

  
  // reset the played words
  app.get('/play/restart', app.restrictUser, function(req, res) {
    req.session.playedWords = [];
    
    req.flash('info', "Restarted Game");
    
    res.redirect('/play');
  });


  // play the next word
  app.get('/play', app.restrictUser, function(req, res) {

    // word shown can be in either language
    var langCodes = _.keys(app.wordLanguages);    
    var lang = langCodes[ Math.floor( Math.random() * langCodes.length ) ];

    // get a random modeled word, skip words already played successfully.

    var query = { 
      '_id' : { '$nin' : app.getPlayedWords(req) },   // (objIDs)
      'user': app.username(req)
    };
    
    WordHandler.getRandom(app.legacyDB, query, function(error, word, count) {
      if (error) {
        req.flash('error', "Error: " + util.inspect(error));

        // console.log('at ', req.url, 'redirect to /word/list');
        res.redirect('/word/list');
      }
      else if (count === 0) {    // out of words!
        res.render('play', {
          pageTitle: 'Play',
          gameOver: true,
          showWordLinks: true,
          question: null,
          langCode: null,
          language: null,
          word: null,
          remaining: count,
          activeNav: 'play'
        });
      }
      else {
        // console.log('random word:', word);
        
        if (_.isUndefined(word['word_' + lang])) {
          req.flash('error', "Error: Missing " + app.wordLanguages[lang] + " word.");

          // console.log('at ', req.url, 'redirect to /word/list');
          res.redirect('/word/list');
        }
        
        res.render('play', {
          pageTitle: 'Play',
          question: word['word_' + lang],     // shown word
          langCode: lang,
          language: app.wordLanguages[lang].toLowerCase(),
          word: word,
          gameOver: false,
          showWordLinks: true, //false
          remaining: count,
          activeNav: 'play'
        });
      }
    }); //getRandom

  });  //app.get
  
};