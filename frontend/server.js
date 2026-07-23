var h=require('http'),fs=require('fs'),p=require('path');
var dir=__dirname;
var MONOLITH = 'http://localhost:8080';  // Single backend for monolith

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

  // /api/v1/text/repos — read/write repos.json (local)
  if (url === '/api/v1/text/repos') {
    if (rq.method === 'GET') {
      try {
        var defaults = [
          { id:'crosswire', name:'CrossWire 主仓', url:'https://crosswire.org/ftpmirror/pub/sword' },
          { id:'crosswire-beta', name:'CrossWire Beta', url:'https://crosswire.org/ftpmirror/pub/sword/beta' },
          { id:'crosswire-av11n', name:'CrossWire Av11n', url:'https://crosswire.org/ftpmirror/pub/sword/av11n' },
          { id:'xmission', name:'XMission', url:'http://ftp.xmission.com/pub/crosswire' }
        ];
        var reposPath = p.join(dir, 'repos.json');
        if (fs.existsSync(reposPath)) {
          var raw = fs.readFileSync(reposPath, 'utf8');
          if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
          var reposData = JSON.parse(raw);
          var customs = (reposData.customRepositories || []).map(function(r,i){ return { id:'custom-'+i, name: r.name, url: r.baseUrl }; });
          defaults = defaults.concat(customs);
        }
        rs.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        rs.end(JSON.stringify({repos:defaults}));
      } catch(e) {
        rs.writeHead(500, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        rs.end(JSON.stringify({repos:[], error:e.message}));
      }
      return;
    }
    if (rq.method === 'POST') {
      var body = [];
      rq.on('data', function(c){body.push(c)});
      rq.on('end', function(){
        try {
          var data = JSON.parse(Buffer.concat(body).toString());
          fs.writeFileSync(p.join(dir, 'repos.json'), JSON.stringify(data, null, 2), 'utf8');
          rs.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
          rs.end(JSON.stringify({success:true}));
        } catch(e) {
          rs.writeHead(400, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
          rs.end(JSON.stringify({success:false,error:e.message}));
        }
      });
      return;
    }
  }

  // Zvec bridge — vector database endpoints
  if (url.startsWith('/zvec/')) {
    if (rq.method === 'POST' || rq.method === 'PUT') {
      var zbody = [];
      rq.on('data', function(c) { zbody.push(c); });
      rq.on('end', function() {
        try {
          var zjson = JSON.parse(Buffer.concat(zbody).toString());
          require('./zvec-bridge').handleZvec(url, rq.method, zjson, rs);
        } catch(e) {
          rs.writeHead(400, {'Content-Type':'application/json'});
          rs.end(JSON.stringify({error: 'Invalid JSON: ' + e.message}));
        }
      });
    } else {
      require('./zvec-bridge').handleZvec(url, rq.method, {}, rs);
    }
    return;
  }

  // Proxy ALL /api/* requests to monolith (:8080)
  if (url.startsWith('/api/')) {
    proxy(MONOLITH, rq, rs); return;
  }

  // /library/book/ → library reader (SPA route)
  if (url.startsWith('/library/book/')) {
    try {
      var bookHtml = fs.readFileSync(p.join(dir, 'library', 'book.html'));
      rs.writeHead(200, {'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate'});
      rs.end(bookHtml);
    } catch(e) { rs.writeHead(404); rs.end('Library reader not found'); }
    return;
  }

  // Static files
  var f = url;
  // Root or directory-ending-with-/ → serve index.html
  if (f === '/' || f === '') { f = '/index.html'; }
  else if (f.endsWith('/')) { f = f + 'index.html'; }
  var fp = p.join(dir, f);
  // If resolved path is a directory, serve index.html inside it
  try {
    var stats = fs.statSync(fp);
    if (stats.isDirectory()) fp = p.join(fp, 'index.html');
  } catch(e) {}
  try {
    var c = fs.readFileSync(fp);
    var ct = fp.endsWith('.js') ? 'text/javascript;charset=utf-8' :
             fp.endsWith('.css') ? 'text/css;charset=utf-8' :
             fp.endsWith('.png') ? 'image/png' :
             fp.endsWith('.svg') ? 'image/svg+xml' :
             fp.endsWith('.json') ? 'application/json;charset=utf-8' :
             fp.endsWith('.ico') ? 'image/x-icon' :
             'text/html;charset=utf-8';
    rs.writeHead(200, {'Content-Type': ct, 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0'});
    rs.end(c);
  } catch(e) {
    rs.writeHead(404);
    rs.end('Not Found: ' + url);
  }
}).listen(3000, '127.0.0.1', function(){console.log('bible-monolith FE on :3000')});
