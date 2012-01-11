// Flashcards app configuration
// loads into app.conf

module.exports = function(envId){

  var conf = {
    // THESE ONLY APPLY IF RUNNING STANDALONE, OTHERWISE OVERRIDDEN BY PARENT CONF
    // === SO NOT IMPORTANT TO SET THIS UP CORRECTLY ===
      hostName: 'nld-apps.local'
    , port: 3000

    , dbHost: 'localhost'
    , dbName: 'flashcards'

    , sessionSecret: '1234567890'  // for session store



    // IMPT for sub-app too!
    // see http://www.wordreference.com/docs/api.aspx
    , wordreference_api_key: '12345'
  };
  
  return conf;
};
