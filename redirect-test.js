// test: is app.redirect() working?

var express = require('express');

var app = express.createServer();


// this seems to work fine
app.redirect('r1', '/inner');

app.get('/', function(req, res) {
  res.redirect('r1');
});

app.get('/inner', function(req, res) {
  res.end('at inner page!');
});


// what about a mounted app?
var subApp = express.createServer();
subApp.redirect('r2', '/inner');

subApp.get('/sub', function(req, res) {
  //res.end('in subapp!');
  res.redirect('r2');
});
app.use(subApp);
// .. this works fine too!
// so why isn't it working in auth??


// what about when the redirect name is the same as a path w/o leading slash?
app.get('/outer', function(req, res) { res.redirect('inner'); });
app.redirect('inner', '/inner');
// .. that works too


app.listen(80);
