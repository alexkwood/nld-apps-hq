// determine if a schema can be modified after it's model()'d
//

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TestSchema = new Schema({ });

TestSchema.virtual('oldKey').get( function() { return 'old_key'; });

// use the schema as a MODEL. can only do once!
var Test = mongoose.model('Test', TestSchema);

// if unable to add to existing model, this shouldn't work
TestSchema.virtual('newKey').get( function() { return 'some_key'; });

// Test.virtual() doesn't work -- no method on that object

// if this is FIRST modeled here, then newKey works
//var Test = mongoose.model('Test', TestSchema);


var test = new Test();
console.dir(test);
console.log('old key: ', test.oldKey);      // old_key
console.log('new key: ', test.newKey);      // undefined


// re-model - doesn't work!!
Test = mongoose.model('Test', TestSchema);

var Test2 = mongoose.model('Test');

console.log('remodeled, newKey: ', test.newKey);                // undefined

var test2 = new Test();
console.log('remodeled, new object, newKey: ', test.newKey);    // undefined

var test3 = new Test2();
console.log('newKey on fresh model object: ', test3.newKey);    // undefined


