
/*
 * GET home page.
 */

module.exports = function(app) {
  app.get('/', app.ensureLoadUser, app.requireUser,
    function(req, res){
      console.log('rendering HQ index');
      res.render('index', { title: 'Express' })
    }
  )
};
