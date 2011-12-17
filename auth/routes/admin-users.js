// setup route for user admin

module.exports = function(app) {
  app.get('/admin/users', app.loadUser, app.requireUserCan('admin_users'),
    function(req, res) {
      res.send('user admin goes here');
    }
  );
};
