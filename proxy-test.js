/**
 * HQ for NLD Apps
 * use a proxy to direct hosts to other apps
 */

var http = require('http'),
    httpProxy = require('http-proxy');

/
// Create your proxy server
//
httpProxy.createServer(3000, 'localhost').listen(80);


/*
var proxyTable = {
  router: {
    '/sharelist' : '127.0.0.1:3000'
  }
};

var proxyServer = httpProxy.createServer(proxyTable);
proxyServer.listen(80);
*/