var util = require('util')
  , Seq = require('seq');

Seq()
  .par(function() {
    console.log('in A');
    console.log('vars:', util.inspect(this.vars));

    // maintain scope of 'this' in timeout (closure works but is too long; call() doesn't work, this works)
    setTimeout(function(next) { console.log('timer done in A'); next(); }, 700, this);

  })
  .par(function(passedVar) {
    console.log('in B');
    console.log('vars:', util.inspect(this.vars));

    //this();
    setTimeout(this, 500);
  }) 
 .seq(function() {
    console.log('in C');
    console.log('vars:', util.inspect(this.vars));

    this();
  })
  .seq(function() {
    console.log('in D');
    this('some error');
  })
  .seq(function() {
    console.log('this should never run! (skipped by error)');
    this();
  })
  .catch(function(err){
    console.log('caught an error:', util.inspect(err));
    // no this() here
  })

  // for some reason this causes an endless error loop:
/*  .seq(function() {
    console.log('keeps running!');
    //this('another error');
  })
  .catch(function(err){
    console.log('caught another error:', util.inspect(err));
    //this.empty();
  })*/
  ;

// a way to build key:value pairs async'ly:
Seq()
  .seq('firstVar', function() { this(null, 'A'); })
  .seq('secondVar', function() { this(null, 'B'); })
  .seq('thirdVar', function() { this(null, 'C'); })
  .seq(function() {
    console.log('vars at end: ', this.vars);
  });

