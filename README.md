# NewLeafDigital Apps
Built in a node.js+mongoDB stack by freelance web developer Ben Buckman

**Hosted at [apps.newleafdigital.com](http://apps.newleafdigital.com).**
Code on GitHub: [nld-apps-hq](https://github.com/newleafdigital/nld-apps-hq)


# About Ben

Ben Buckman is the founder of [New Leaf Digital](http://newleafdigital.com), a development shop specializing in the [Drupal](http://drupal.org) CMS/framework and now [Node.js](http://nodejs.org).

If you are looking for Node.js work, please [contact us](http://newleafdigital.com/contact).


# Evolution of the apps

These apps evolved over time as I learned node.js. They began with the [Spanish Flashcards](http://benbuckman.net/tech/11/10/exploring-nodejs-frontier) app, on which I learned the basics of [node](http://nodejs.org),
[express](http://expressjs.com), and [MongoDB](http://mongodb.org)-node integration. I then built the [Interactive Shopping Lists](https://github.com/newleafdigital/interactive-shopping-list) app as a proof of concept using [socket.io](http://socket.io).

I then decided to bring them together into a suite of apps, to demo good production code. To authenticate into the suite, I used [everyauth](https://github.com/bnoguchi/everyauth) with Facebook Connect, and [Mongoose](http://learnboost.github.com/mongoose/) for the model. That effort became the Auth sub-app.

To bring the 4 apps (primary/HQ, auth, flashcards, lists) together, there were a few options: a parent app proxying to child apps running independently; vhosts (requiring separate DNS records); or using Connect/Express's "mounting" capability. Mounted apps were the most complex option, but offered the best opportunity to learn the deep innards of Express, and the proxy solution was [unclear](https://github.com/nodejitsu/node-http-proxy/issues/167#issuecomment-3264746), so I went with mounted apps.

Along the way I refactored constantly and hit brick walls dozens of times. I rebuilt Lists to handle multiple users and shared lists, added [Bootstrap](http://twitter.github.com/bootstrap/) for aesthetics, tied everything to auth, and refactored all the [Jade](https://github.com/visionmedia/jade) views to share a common layout.


(Thanks to Brandon Hall's [boilerplate](https://github.com/brandonhall/node-social-auth-boilerplate) for helping me with that.)


## License

I am making this code available as a demonstration of production Node.js code, and for others to learn, but not for others to copy and host as-is. This project is therefore licensed under a [**Attribution-NonCommercial-NoDerivs license**](http://creativecommons.org/licenses/by-nc-nd/3.0). Within the terms of that license, feel free to learn from my code, and suggest improvements.


## Enjoy!