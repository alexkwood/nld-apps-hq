/* model for 'word' entities
   use the generic db model
*/

var _ = require('underscore')._;

var collectionName = 'words';     // where should this go?

// simple model for individual Words
var Word = module.exports = function(word) {
  if (_.isEmpty(word)) word = {};
  
  // map properties of 'word' and fill missing values w/ defaults.
  _.extend(this, 
    {
      word_es: '',
      word_en: '',
      type: '',
      
      group: null,
      
      // should these be here, or only handled on save?
      created: null,    //new Date(),
      updated: null,
      
      // every word needs a user!
      user: null
    },
    word);
    
  // new group? (from form)
  if (!_.isUndefined(this.new_group)) {
    if (!_.isEmpty(this.new_group)) {
      this.group = this.new_group;      
    }
    delete this.new_group;
  }
  
  // console.log('modeled new word:', this);  
};


// make sure all the required pieces are in.
Word.prototype.validate = function(callback) {
  try {
    if (_.isEmpty(this.word_es)) return callback(new Error('Missing Spanish word.'));
    if (_.isEmpty(this.word_en)) return callback(new Error('Missing English word.'));
    // [type is optional]

    if (_.isEmpty(this.user)) return callback(new Error('Word missing a user!'));
  }
  catch(error) {    // if something else is wrong w/ object & can't check properties
    return callback(error);    // good?
  }
  
  callback();
};


Word.prototype.save = function(db, callback) {
  console.log('saving word: ', this);
  
  // set a Created or Updated date.
  if (_.isUndefined(this.created)) {
    this.created = new Date;
    console.log('set created date to ', this.created);
  }
  else {
    this.updated = new Date;
    console.log('set updated date to ', this.updated);
  }
  
  db.save(collectionName, this, callback);
};


// @todo 'update' separate from 'save'?

// Word.prototype.XXX = function() {
// };


////////////////////////////////////////////

// word-related handlers not specific to an INDIVIDUAL word.

// @todo make all these functions MAP to model

// take an array of word objects from the DB or elsewhere, and map them to the model object.
// meant to be a helper function for other getters here that retrieve multiple words.
module.exports.mapWordsToModel = function(error, words, callback) {
  if (error) callback(error);
  else {
    words = _.map(words, function mapWordToModel(word) {
      return new Word(word);
    });
    callback(null, words);
  }
};

module.exports.getById = function(db, id, callback) {
  db.getById(collectionName, id, function(error, word) {
    if (error) callback(error);
    else callback(null, new Word(word));
  });
};

// callback takes and passes back word + count
// == query should include 'user' ==
module.exports.getRandom = function(db, query, callback) {
  db.getRandom(collectionName, query, function(error, word, count) {
    if (error) return callback(error);
    else if (count === 0) {    // no words left
      return callback(null, null, 0);
    }
    else {
      // console.log("random word:", word);
      return callback(null, new Word(word), count);
    }
  });
};


// == query should include 'user' ==
module.exports.getWords = function(db, query, callback) {
  db.getDocuments(collectionName, query, function(error, words) {
    module.exports.mapWordsToModel(error, words, callback);
  });
};

// -- should this be part of Word object or separate export?
module.exports.remove = function(db, id, callback) {
  db.remove(collectionName, id, callback);
};


// word types, i.e. parts of speech
// used by getWordType() on word object.
var getWordTypes = module.exports.getWordTypes = function() {
  return {
    'n': 'noun',
    'v': 'verb',
    'adj': 'adjective',
    'adv': 'adverb',
    'pro': 'pronoun',
    'phrase' : 'phrase'
  };
};

// [static] given a word type CODE, return the NAME, or the same if not found.
module.exports.getWordType = function(type) {
  var types = getWordTypes();     // in same file, does that work?
  try {
    if (!_.isUndefined(type) && !_.isUndefined(types[type])) {
      return types[type];
    }
  } catch(e) {}
  
  return type;
};


// get the existing 'group' values
// == query should include 'user' ==
module.exports.getGroups = function(db, query, callback) {
  db.distinct(collectionName, 'group', query, callback);
};
