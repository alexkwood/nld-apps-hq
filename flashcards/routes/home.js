// flashcards home route

module.exports = function(app){

  app.get('/', function(req, res, next){
    
    // only show homepage if not logged in.
    // if logged in, redirect to list
    if (app.isLoggedIn(req)) {
      console.log('at ', req.url, 'redirect to /word/list');
      return res.redirect('/word/list');
    }
    
    res.render('flashcards/home', {
      locals: {
        pageTitle : ''
      }
    });
  });


  // consolidated login and home. for legacy.
  app.get('/login', function(req, res, next) {
    res.redirect('/');
  });
  
};