// override console.log to put a prefix (e.g. app title) in messages

module.exports = function(prefix) {
  // if this runs in multiple sup-apps, keep original _orig functions
  console._orig_log = console._orig_log || console.log;
  console._orig_warn = console._orig_warn || console.warn;
  console._orig_error = console._orig_error || console.error;
  
  var _consoleLogHelp = function(args) {
    // var prefix = '[global]';
    // if (typeof app != 'undefined' && typeof app.name != 'undefined') prefix = '[' + app.name + ']';

    // string (allows for %s-type escapes)
    if (typeof args[0] != 'undefined' && typeof args[0] === 'string') args[0] = prefix + ' ' + args[0];
    // or object (preserves raw dump style)
    else args.unshift(prefix);
    return args;
  }

  return {
    log: function() {
      var args = Array.prototype.slice.call(arguments);
      args = _consoleLogHelp(args);
      console._orig_log.apply(this, args);
    },

    warn: function() {
      var args = Array.prototype.slice.call(arguments);
      args = _consoleLogHelp(args);
      console._orig_warn.apply(this, args);
    },

    error: function() {
      var args = Array.prototype.slice.call(arguments);
      args = _consoleLogHelp(args);
      console._orig_error.apply(this, args);
    }  
  };

};



/* 
// TEST
console.log('early');

var app = { 'name': 'my app' };

var msg;

msg = 'new';
console._orig_log(msg);
console.log(msg);

msg = {x:5, y:10};
console._orig_log(msg);
console.log(msg);

console._orig_log('some %s', 'string');
console.log('some %s', 'string');

console._orig_log();
console.log();

app.name = 'Another app';
console.log('other?');
*/