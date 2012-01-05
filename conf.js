// HQ app configuration
// call w/ envId as param, loads into app.conf

module.exports = function(envId) {
  var conf = {};

  switch(envId) {
    // Ben local
    case 'local':
      console.log("Loading conf for Ben Local");
    
      conf.hostName = 'nld-apps.local';
      conf.port = 3000;
  
      conf.dbHost = 'localhost';
      conf.dbName = 'nld_apps';

      // this disables everyauth, fb connect, fakes login.
      conf.localNoAuth = true;
      break;
  
    // Production (on server)
    case 'production':
      console.log("Loading conf for Production");

      conf.hostName = 'localhost';      // ?
      conf.port = 80;
  
      conf.dbHost = 'localhost';
      conf.dbName = 'nld_apps';
    
      conf.localNoAuth = false;
      break;
  
    // Dev (on server)
    default:
      console.log("Loading conf for Dev/other");

      conf.hostName = 'localhost';      // ?
      conf.port = 3000;
  
      conf.dbHost = 'localhost';
      conf.dbName = 'nld_apps_dev';

      conf.localNoAuth = false;    
  }

  // Common
  conf.sessionSecret = 'ab55e616a760d302';  // for session store

  return conf;
};