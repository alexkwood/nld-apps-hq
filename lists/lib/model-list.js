// mongoose model for Lists

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Promise = mongoose.Promise
  , _ = require('underscore')
  , async = require('async');

var List = {
  // (_id:ObjectID is implicit)

  title: { type: String, index: true },

  // [old]
  // created_by: String,         // username
  
  // DBRef to User model
  // using standard mongoose dbref.
  // [would have been nicer to maintain join on the readable system_name, 
  //  maybe possible w/add-on mongoose-join module, but too complicated for now]
  _creator: { type: Schema.ObjectId, ref: 'User', index: true },

  // more joined user IDs (filled in when non-creator user accesses)
  _guests: [ { type: Schema.ObjectId, ref: 'User' } ],    // index? (how do indexed arrays work?)
  
  created_time: { type: Date, default: Date.now },
  updated_time: { type: Date, default: Date.now },
  
  items: [ String ]
};

var ListSchema = module.exports = new Schema(List);


// get all lists for a query (helper)
// return the query obj and/or run callback
ListSchema.statics.getLists = function(query, listIdAtTop, callback) {
  return this.find(query, 
    function(error, lists) {
      // if 'listIdAtTop' specified, find & move that ID to the top
      if (!error && lists && listIdAtTop) lists = sortListsWithTopId(lists, listIdAtTop);

      if (typeof callback == 'function') callback(error, lists);
      // else console.warn('getLists has no callback');
    }
  );
};


// get lists created by a given user (ID)
// return the query obj and/or run callback
ListSchema.statics.getListsCreatedByUser = function(userId, listIdAtTop, callback) {
  var query = { _creator: userId };
  return this.getLists(query, listIdAtTop, callback);
};

// get lists where a given user (ID) is a guest but not the author
// return the query obj and/or run callback
ListSchema.statics.getListsVisitedByUser = function(userId, listIdAtTop, callback) {
  var query = {
    _creator: { '$ne': userId },
    _guests: userId     // (no $has operator, just equals)
  };
  return this.getLists(query, listIdAtTop, callback);
};


// counts: for admin/users
// uses query obj returned from getLists
ListSchema.statics.countListsCreatedByUser = function(userId, callback) {
  var query = this.getListsCreatedByUser(userId, null);
  return query.count(callback);
};

ListSchema.statics.countListsVisitedByUser = function(userId, callback) {
  var query = this.getListsVisitedByUser(userId, null);
  return query.count(callback);
};



// helper function: given an array of Lists, sort them so a particular ID is at the top
// (sync)
var sortListsWithTopId = function(lists, listIdAtTop) {
  if (lists.length && listIdAtTop) {
    // console.log("** Need to sort lists", lists, "with ", listIdAtTop, " at the top.", typeof lists);
    
    // return sort -1 to top item, otherwise same ind
    lists = _.sortBy(lists, function(list, ind) {
      if (list._id && list._id.toString() == listIdAtTop.toString()) {
        // console.log('** found top item!', list._id);
        return -1;
      }
      else return ind;
    });
    // console.log('sorted?', lists);
  }  
  return lists;
}



ListSchema.methods.countItems = function() {
  try {
    return this.items.length;
  }
  catch(e) {
    return "Unknown (" + e + ")";
  }
}


// set update time on save
ListSchema.pre('save', function(next) {
  this.updated_time = new Date;
  console.log('saving list:', this);
  next();
});


// CONTROLLER logic for routes / sockets

// add an item to an individual list, wrapper for push + save
ListSchema.methods.addItem = function(itemName, callback) {
  // (tried to use List.update(this.list, { $push ...}), but that doesn't update the doc! - so using JS push)
  this.items.push( itemName );
  this.save(callback);
};


// get a list and add an item
ListSchema.statics.addItemToList = function(listId, itemName, callback) {
  this.findById(listId, function(error, list) {
    console.log('found by id:', error, list);
    if (error || !list) return callback(new Error("List doesn't exist?"));

    list.addItem(itemName, function(error) {
      if (error) return callback(error);
      else callback(null, list);      
    });
  });
};


// remove an item from an individual list
ListSchema.methods.removeItem = function(itemName, callback) {
  var ind = _.indexOf(this.items, itemName);
  if (ind == -1) return callback("Can't find item, maybe already removed?");
  this.items.splice(ind, 1);
  this.save(callback);  
};


// get a list and remove an item
ListSchema.statics.removeItemFromList = function(listId, itemName, callback) {
  this.findById(listId, function(error, list) {
    if (error || !list) return callback(new Error("List doesn't exist?"));
    
    list.removeItem(itemName, function(error){
      if (error) return callback(error);
      else callback(null, list);
    });
  });
};


// find and delete a list
ListSchema.statics.removeList = function(listId, callback) {
  this.findById(listId, function(error, list) {
    if (error || !list) return callback(new Error("List doesn't exist?"));
    
    list.remove(callback);
  });
};


// check if the creator is a given user (by user ID)
// (sync return)
// potential problem: ID can sometimes be an ObjectID and sometimes a string. (so always cast to string.)
ListSchema.methods.isCreator = function(userId) {
  try {
    if (! this._creator._id) {
      console.error("List object is missing its creator ID: need to populate()?");
      return false;
    }
    return _.isEqual(this._creator._id.toString(), userId.toString());
  }
  catch(e) {
    console.error("Error in isCreator", e);
    return false;
  }
}


// check if the user is either the creator or a guest (of an individual list)
// the ID type checking here is also used with isCreator
ListSchema.methods.isCreatorOrGuest = function(userId) {
  // console.log("Checking if ", userId, "(" + typeof userId + ") is creator or guest of ", this);
  
  if (this.isCreator(userId)) return true;
  userId = userId.toString();
  
  // check the guest list
  if (_.isUndefined(this._guests) || !_.isArray(this._guests)) return false;

  // (true if any item passes truth iterator)
  return _.any(this._guests, function iterator(guest) {
    // console.log('guest:', guest, ' vs ', userId);
    if (guest._id && _.isEqual(guest._id.toString(), userId)) return true;
    if (_.isEqual(guest.toString(), userId)) return true;    // not populated, just ID
    // console.log("Mismatch", guest, '('+typeof guest+')', userId, '('+typeof userId+')');
    return false; //(iterator)
  });
};
