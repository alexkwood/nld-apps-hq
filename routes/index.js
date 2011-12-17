
/*
 * GET home page.
 */

exports.index = function(req, res){
  console.log('rendering HQ index');

  res.render('index', { title: 'Express' })
};
