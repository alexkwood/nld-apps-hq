var _ = require('underscore')._;

var WordReference = require('../wordreference/wordreference.js');

var util = require('util');

// app passed as closure
module.exports = function(app){

  app.get('/lookup', app.restrictUser, function(req, res) {
    res.render('flashcards/lookup', {
      locals: {
        pageTitle: 'Lookup a word with WordReference API',
        result: null,
        words: {},
        activeNav: 'lookup'
      }
    });
  });

  app.post('/lookup', app.restrictUser, function(req, res) {
    var wr = new WordReference(app.config.wordreference_api_key);     // @todo handle missing key

    var body = ''
      , dictionary 
      , word
      , compounds = null
      , definitions = null;
    
    if (!_.isEmpty(req.body.word_es)) {
      dictionary = 'esen';
      word = req.body.word_es;
    }
    else if (!_.isEmpty(req.body.word_en)) {
      dictionary = 'enes';
      word = req.body.word_en;
    }
    else {
      req.flash('error', "Needs a word to lookup!");
      res.redirect('back');
    }
    
    // for TESTING - French dictionary is better
    // dictionary = 'enfr';
    // req.flash('warning', 'Temporarily forcing French dictionary!');
    
    wr.query(dictionary, word, function(error, result) {
      if (error) {
        body += 'Error: ' + '<pre>' + util.inspect(error) + '</pre>' + '<br/><br/>';
        body += 'Result: ' + '<br/>' + '<pre>' + result + '</pre>' + '<br/><br/>';
      }
      else {
        var parsed = wr.parse(result);
        
        // add links to definitions
        _.forEach(parsed.definitions, function(definition){
          var type = _.isUndefined(definition.type) ? definition.POS : definition.type;  // use converted/consistent type codes
          definition.addWordUrl = '/word/add?'
            + (dictionary == 'esen' ? 
                'word_es=' + word + '&word_en=' + definition.term + '&type=' + type + '&'
              : 'word_en=' + word + '&word_es=' + definition.term + '&type=' + type + '&'
            );
        });

        definitions = parsed.definitions;
        compounds = parsed.compounds;
        body += parsed.raw;
      }
      
      res.render('flashcards/lookup', {
        locals: {
          pageTitle: 'Lookup: ' + word,
          words: req.body,
          result: body,
          definitions: definitions,
          compounds: compounds,
          activeNav: 'lookup'
        }
      });
    });
  });
  
};