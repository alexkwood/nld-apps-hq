// identify the app environment (for config)

module.exports = function(app) {
  var envId = 'development';    // default

  var isBenLocal = /benmacpro/i.test(require('os').hostname());
  var isProduction = (/production/i.test(app.settings.env));
  // var isDev = (/development/i.test(app.settings.env));

  if (isBenLocal) envId = 'local';
  else if (isProduction) envId = 'production';

  return envId;
};