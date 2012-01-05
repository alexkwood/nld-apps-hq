// mongoose model for Lists

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Promise = mongoose.Promise
  // , _ = require('underscore')
  // , async = require('async')
  
var List = {
  // id: ObjectId,     // redundant?

  title: String,

  created_by: String,         // username
  shared_with: [ String ],    // more usernames  
  
  created_time: { type: Date, default: Date.now },
  
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


ListSchema.methods.countItems = function() {
  try {
    return this.items.length;
  }
  catch(e) {
    return "Unknown (" + e + ")";
  }
}