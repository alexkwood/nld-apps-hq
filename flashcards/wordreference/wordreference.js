/** module for WordReference API integration **/

var http = require('http'),
    _ = require('underscore')._,
    util = require('util');

/*
== TOS (http://www.wordreference.com/docs/api.aspx) ==
You must include the copyright line: © WordReference.com
You must link back to the term's entry on WordReference's website with the translation or equivalent of: 'term' at WordReference.com
No derivative works (without permission).
API data can only be stored and cached for 24 hours (without permission).
You are limited to 600 requests to the API per hour by default.
Cannot be used in: browser toolbars.
Cannot be used in an application or webpage whose primary function is as a dictionary or translator (without permission).
*/

var WR = module.exports = function(key) {
  this.key = key;
};

WR.prototype.version = function() {
  return '0.8';
};

// return a URL in array format like http.get() wants.
WR.prototype.url = function(dictionary, term) {
  /*
  http://api.wordreference.com/{api_version}/{API_key}/json/{dictionary}/{term}
  where {term} is the term being searched for, {dictionary} is the dictionary you want to search, 
  and {api_version} is the desired version of the API. 
  If {api_version} is omitted, the API will redirect to the latest version automatically. 
  ...the current version is 0.8.
  
  not using jsonp callback. ?
  */
  
  return {
    'host': 'api.wordreference.com',
    'port': 80,
    'path': "/" + this.version() + "/" + this.key + "/json/" + dictionary + "/" + term
  };
};


// query the API and return a raw response object (via callback)
WR.prototype.query = function(dictionary, term, callback) {
  var url = this.url(dictionary, term);
  
  var options = _.extend(url, {
    'method': 'GET',
    'headers': {
      'User-Agent': 'Spanish Flashcards',   // API returns error w/o this
      'Content-type': 'text/json'           // ?
      // 'Connection': 'keep-alive',
    }
  });

  // console.log('querying url:', url, 'with options:', options);
  
  var bodyParts = [];
  
  var req = http.request(options, function(res){
    console.log("Got WR response, code:", res.statusCode);
    
    res.setEncoding('utf8');
    
    res.on('data', function (chunk) {
      bodyParts.push(chunk);
      // console.log('added body chunk');
    });
    
    res.on('end', function() {
      // == pass result back to server response here ==      
      try {
        var body = bodyParts.join('');
        var data = JSON.parse(body);
      }
      catch(e) {
        console.log('error parsing json', e);
        return callback(e, body);
      }
      
      return callback(null, data);
    });
  })
  .on('error', function(e) {
    console.log('http request error!', e);
    callback(e);
  })
  .end();

};  //query()


// take the json object returned from API and parse it for the lookup results.
// (sync)
WR.prototype.parse = function(result) {
  var out = {
    definitions: [],
    compounds: [],
    raw: ''
  },
  termCount,
  term,
  definition;
  
  // out.raw = 'Result: ' + '<br/>' + '<pre>' + util.inspect(result, true, null) + '</pre>' + '<br/><br/>';

  try {
    if (! _.isUndefined(result.original.Compounds)) {
      out.compounds = _.toArray(result.original.Compounds);
      
      // get consistent word types
      _(out.compounds).each(function(compound) {
        if (!_.isUndefined(compound.OriginalTerm))
          if (!_.isUndefined(compound.OriginalTerm.POS))
            compound.type = WR.convertWordType(compound.OriginalTerm.POS);            
      });
      
    }
  } catch(e) {}
  
  try {
    for(termCount = 0; ; termCount++) {
      if (! _.isUndefined(result['term' + termCount])) {
        // out.raw += "Found term " + termCount + "<br/>";

        term = result['term' + termCount];
        
        _(['PrincipalTranslations', 'AdditionalTranslations']).each(function(t1) {

          if (! _.isUndefined( term[t1] )) {
            _.each(term[t1], function(t) {    // 0,1,etc

              _(['FirstTranslation', 'SecondTranslation', 'ThirdTranslation']).each(function(t2) {
                if (!_.isUndefined( t[t2] )) {
                  
                  definition = t[t2];
                  
                  // get consistent word types
                  definition.type = WR.convertWordType(definition.POS);
                  
                  out.definitions.push( definition );
                }
              });

            });          
          }
          
        });
        
      }
      else break;
    }
    
  } catch(e) {}

  // out.raw += 'Translations: ' + '<pre>' + util.inspect(out.definitions, true, null) + '</pre><br/><br/>';
  
  return out;
};



// [static function]
// for a given WR word type (code),
// return the code consistent with the rest of this app. [or same if unknown]
// @see WordHandler.getWordTypes()
WR.convertWordType = function(wrType) {
  if (_.isUndefined(wrType)) return;
  
  switch(wrType) {
    case 'nf': case 'nm':
      return 'n';
    
    case 'vtr': case 'vi':
      return 'v';
  }
  
  return wrType;
};