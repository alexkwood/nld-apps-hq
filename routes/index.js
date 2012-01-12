/*
 * GET home page.
 */

module.exports = function(app) {
  app.get('/', 
    //app.requireUser,
    function(req, res){
      //console.log('rendering HQ index');
      
      res.render('index', { 
        'meta_description': 'Apps built in node.js by freelance node.js developer Ben Buckman, New Leaf Digital.'
      });
    }
  )
};
