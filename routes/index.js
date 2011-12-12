
/*
 * GET home page.
 */

exports.index = function(req, res){
  console.log('user on req:', req.user);

  res.render('index', { title: 'Express' })
};
