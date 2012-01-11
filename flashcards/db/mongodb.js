/* simple mongodb handler for Flashcards
  used by word.js "model", goes into app.LegacyMongoHandler
   -- it's really a GENERIC mongo handler, which begs the question, 
      is it necessary at all? shouldn't all this be part of the mongo module?

   add functions to prototype -- need to instantiate a controller to use.
   
   convention for 'callback' -- standard error,results
   
   REFACTORED: THIS NOW GETS A DB CONNECTION FROM _MONGOOSE_.
   (BUT STILL NOT USING MONGOOSE FOR MODELING IN THIS APP)   
   @TODO *** refactor this to actually use Mongoose models! ***
*/

var _ = require('underscore')._;
// var mongodb = require('mongodb');   // better here or in constructor?


// pass an EXISTING db connection
// ** an instance of this is set to app.legacyDB **
var MongoHandler = module.exports = function(conn) {
  // removed dbName param; removed this.mongo, this.db.
  // now takes existing db connection from shared space.
  
  this.db = conn;
};


// legacy
MongoHandler.prototype.open = function(callback) {
  console.warn('DEPRECATED FUNCTION MongoHandler.prototype.open CALLED');
  callback(null);
};

MongoHandler.prototype.getCollection = function(collectionName, callback) {
  var db = this.db;   // otherwise gets lost ... figure out why!
  db.collection(collectionName, function(error, collection) {
    if (error) {
      // don't fail just yet -- try to CREATE the collection in case it doesn't exist.
      // [only necessary when strict mode is ON.]
      db.createCollection(collectionName, function(error, collection){
        if (error) return callback(error);
        else return callback(null, collection);
      });      
    }
    else callback(null, collection);
  });
};

MongoHandler.prototype.getDocuments = function(collectionName, query, callback) {
  this.getCollection(collectionName, function(error, collection) {
    if (error) return callback(error);
    else {
      collection.find(query, function(error, cursor) {
        if (error) return callback(error);
        else {
          cursor.toArray(function(error, results) {
            if (error) return callback(error);
            else return callback(null, results);
          });
        }
      });
    }
  });
};


// doc should be a modeled object
MongoHandler.prototype.save = function(collectionName, doc, callback) {
  // console.log('about to save doc:', doc);
  
  var collection = this.getCollection(collectionName, function(error, collection) {
    if (error) return callback(error);

    collection.save(doc, {}, function(error, result) {
      // console.log('collection.save:', error, result);
      if (error) return callback(error);
      
      // if save() results in update(), then 'result' will be null. assume success if no error. [??]
      if (_.isEmpty(result)) {
        result = doc;
        // console.log('[save] assuming successful update()', result);
      }
      
      return callback(null, result);
    });
  });
};


MongoHandler.prototype.getById = function(collectionName, id, callback) {
  id = MongoHandler.objectID(id);
  var collection = this.getCollection(collectionName, function(error, collection) {
    if (error) return callback(error);
    else {      
      collection.findOne({ _id: id }, function(error, doc){
        if (error) return callback(error);
        else {
          // console.log('doc:', doc);
          return callback(null, doc);
        }
      });
    }
  });
};



// get a random doc in a collection
// filter by 'query' (pass {} for all)
// pass back the count along with a random doc
MongoHandler.prototype.getRandom = function(collectionName, query, callback) {
  var collection = this.getCollection(collectionName, function(error, collection) {
    if (error) return callback(error);
    else {
      // console.log('count query:', query);
      
      collection.count(query, function countCallback(error, count) {
        // console.log("count result: ", count);
        
        if (error) {
          console.error('count query error!', error);
          return callback(error);
        }
        else if (isNaN(count)) {
          console.error("Count", count, " is not a number!");
          return callback(new Error("Error counting remaining words"));
        }
        
        // skip a random number of records
        var skip = Math.floor(Math.random() * count);
        // console.log('random query skip:', skip);
        
        // impt: can't use findOne() w/ skip for some reason.
        collection.find(query, { 
            limit: 1, 
            skip: skip
          },
          function findCallback(error, cursor){
            if (error) return callback(error);
          
            cursor.nextObject( function(error, doc){
              if (error) return callback(error);
              else {
                // console.log('doc:', doc);            
                return callback(null, doc, count);
              }
            }); //nextObj
          } //findCallback
        ); //find
      }); //countCallback
    }
  }); //coll

};  //getRandom


MongoHandler.prototype.remove = function(collectionName, id, callback) {
  id = MongoHandler.objectID(id);
  var collection = this.getCollection(collectionName, function(error, collection) {
    if (error) return callback(error);
    else {
      collection.remove({ _id: id }, function(error, result) {
        if (error) return callback(error);
        return callback(null, result);
      });
    }
  });
};


// convert an ID string to an ObjectID [STATIC]
MongoHandler.objectID = function(id) {
  var ObjectID = require('mongoose/node_modules/mongodb').BSONPure.ObjectID;
  try {
    var objId = new ObjectID(id);
    return objId;
  }
  catch(e) {
    console.warn('Unable to map objID for', id, e);
    return id;
  }
};


MongoHandler.prototype.distinct = function(collectionName, key, query, callback) {
  var collection = this.getCollection(collectionName, function(error, collection) {
    if (error) return callback(error);
    else collection.distinct(key, query, callback);
  });
};
