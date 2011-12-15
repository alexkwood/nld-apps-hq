// app configuration
// loads into app.conf

// @todo make this a function that gets ENVT name as param?
module.exports = {
  
  hostName: 'http://node.newleafdigital.com',
  
  dbHost: 'localhost',
  dbName: 'nld_apps',

  sessionSecret: 'ab55e616a760d302'  // for session store
  
};
