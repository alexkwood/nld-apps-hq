// mongoose model for Lists

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  // , Promise = mongoose.Promise
  // , _ = require('underscore')
  // , async = require('async')
  
var List = {
  // id: ObjectId,     // redundant?

  title: String,

  created_by: String,
  created_time: { type: Date, default: Date.now },
  
  items: [ String ]
};

var ListSchema = module.exports = new Schema(List);
