var async = require('async');

var results = async.series({
  a: function(next) {
    console.log('in 1, waiting...');
    
    setTimeout(next, 500);
    // next();
  },

  b: function(next) {
    console.log('in 2');
    next(null, 'something');
  },

  c: function(next) {
    console.log('in 3');
    next(null, 'else');
  }
},

function(err, results) {
  console.log('results:', results);
});

