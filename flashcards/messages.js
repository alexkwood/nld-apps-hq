/*
 * adapted from express-messages
 */

module.exports = function(req, res){
  return function(){
    var buf = []
      , messages = req.flash()
      , types = Object.keys(messages)
      , len = types.length;
    if (!len) return '';
    buf.push('<div id="messages">');
    for (var i = 0; i < len; ++i) {
      var type = types[i]
        , msgs = messages[type];
      if (msgs) {
        buf.push('  <ul class="' + type + '">');
        for (var j = 0, l = msgs.length; j < l; ++j) {
          var msg = msgs[j];

          // customized this part
          buf.push('    <li>' + '<span class="msg-type">' + type + '</span> ' + msg + '</li>');
          
        }
        buf.push('  </ul>');
      }
    }
    buf.push('</div>');
    return buf.join('\n');
  }
};