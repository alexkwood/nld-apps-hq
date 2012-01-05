// Auth app configuration
// call w/ envId as param, loads into app.conf

module.exports = function(envId) {
  var conf = {};
  
  // [moved globals to parent auth: hostName, dbHost, dbName, sessionSecret]

  switch (envId) {
    case 'local':
      // local
      fbAppId = '144120279031108';
      fbAppSecret = '2c755924ef1c4425e96f72371e0a944f';
      break;
    
    // server
    case 'production': case 'development': default:
      fbAppId = '214626601947311';
      fbAppSecret = 'c039b7f9b7eeae96b9e406a46777755b';
      break;
  }


  return conf;
};
