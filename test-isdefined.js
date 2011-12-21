var _ = require('underscore');

var o = {
  a: 1,
  b: {
    c: 2
  }
};

//if (! o.a.b.c.d) {
//  console.log('wow a lot of levels!');
//}

try {
  if (! o.b.c.d.e.f) {
    console.log('_ can handle it!');
  }
}
catch(e) {
  console.log('caught: ', e);
}
