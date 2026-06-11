var h=require('http'),fs=require('fs'),p=require('path');
var dir=__dirname;
var BACKEND = 'http://localhost:8080';
var SWORD   = 'http://localhost:8086';

// Proxy helper
function proxy(target, rq, rs) {
  var u = new URL(target);
  var opt = {
    hostname: u.hostname, port: u.port,
    path: rq.url,
    method: rq.method,
    headers: Object.assign({}, rq.headers, { host: u.host })
  };
  delete opt.headers['origin'];
  var pr = h.request(opt, function(prs) {
    var body = [];
    prs.on('data', function(c) { body.push(c); });
    prs.on('end', function() {
      var b = Buffer.concat(body);
      var hd = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' };
      if (prs.headers) Object.assign(hd, prs.headers);
      delete hd['transfer-encoding'];
      rs.writeHead(prs.statusCode, hd);
      rs.end(b);
    });
  });
  pr.on('error', function() { rs.writeHead(502); rs.end('Backend unavailable'); });
  if (rq.method === 'POST' || rq.method === 'PUT') { rq.pipe(pr); } else { pr.end(); }
}

h.createServer(function(rq, rs) {
  var url = rq.url.replace(/[?#].*/,'');

  // Proxy /api/v1/sword/* to Sword service (:8086)
  if (url.startsWith('/api/v1/sword/') || url.startsWith('/api/v1/strongs/sword/')) {
    proxy(SWORD, rq, rs); return;
  }

  // Proxy ALL other /api/* requests to Gateway (:8080)
  if (url.startsWith('/api/')) {
    proxy(BACKEND, rq, rs); return;
  }

  // Static files
  var f = url.replace(/\/$/,'') || '/index.html';
  f = p.join(dir, f);
  try {
    var c = fs.readFileSync(f);
    var ct = f.endsWith('.js') ? 'text/javascript;charset=utf-8' :
             f.endsWith('.css') ? 'text/css;charset=utf-8' :
             'text/html;charset=utf-8';
    rs.writeHead(200, {'Content-Type': ct});
    rs.end(c);
  } catch(e) {
    rs.writeHead(404);
    rs.end('Not Found');
  }
}).listen(3000, '127.0.0.1', function(){console.log('FE on 3000 (full API proxy)')});