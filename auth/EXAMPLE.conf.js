// Auth app configuration
// call w/ envId as param, loads into app.conf

module.exports = function(envId) {
  var conf = {};
  
  // [moved globals to parent auth: hostName, dbHost, dbName, sessionSecret]

  switch (envId) {
    case 'production':
      fbAppId = '12345678901234567890';
      fbAppSecret = '123456789012345678901234567890';
      break;
    
    // server
    case 'development': default:
      fbAppId = '12345678901234567890';
      fbAppSecret = '123456789012345678901234567890';
      break;
  }

  return conf;
};
