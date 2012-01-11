// HQ app configuration
// call w/ envId as param, loads into app.conf

module.exports = function(envId) {
  var conf = {};

  switch(envId) {
    case 'production':
      console.log("Loading conf for Production");

      conf.hostName = 'localhost';
      conf.port = 80;
  
      conf.dbHost = 'localhost';
      conf.dbName = 'nld_apps';
    
      conf.localNoAuth = false;
      break;
  
    case 'development': default:
      console.log("Loading conf for Dev/other");

      conf.hostName = 'localhost';
      conf.port = 3000;
  
      conf.dbHost = 'localhost';
      conf.dbName = 'nld_apps_dev';

      conf.localNoAuth = false;
  }

  // Common
  conf.sessionSecret = '1234567890';  // for session store

  return conf;
};