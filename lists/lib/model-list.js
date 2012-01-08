// mongoose model for Lists

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Promise = mongoose.Promise
  , _ = require('underscore')
  , async = require('async');
  
var List = {
  // id: ObjectId,     // redundant?

  title: String,

  created_by: String,         // username

  // @todo fill this in whenever someone other than author loads a list
  shared_with: [ String ],    // more usernames  
  
  created_time: { type: Date, default: Date.now },
  updated_time: { type: Date, default: Date.now },
  
  items: [ String ]
};

var ListSchema = module.exports = new Schema(List);


// for express-mongoose
ListSchema.statics.getLists = function(callback) {
  var promise = new Promise;
  if (callback) promise.addBack(callback);

  // @todo add user filter ('created_by' and 'shared_with')
  this.find({}, promise.resolve.bind(promise));
  return promise;
};


// @todo use me?
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