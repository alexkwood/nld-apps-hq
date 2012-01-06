var async = require('async');

var results = async.series({
  a: function(next, val) {
    console.log('in 1, waiting...', val);
    
    setTimeout(next, 500);
    // next();
  },

  b: function(next, val) {
    console.log('in 2', val);
    next(null, 'something');
  },

  c: function(next, val) {
    console.log('in 3', val);
    next(null, 'else');
  }

  // test errors
, d: function(next, val) {
    console.log('in 4', val);
    next('some error');
  }

},

function(err, results) {
  if (err) console.log('an error occurred!', err);
  else console.log('results:', results);
});


// array, no results - pass between callbacks?
var results = async.series([
  function(next) {
    console.log('in series 2, step 1');
    this.someKey = 'passed!';
    next(null);
  },

  function(next) {
    console.log('in series 2, step 2', this.someKey);
    next(null);
  }

]);

