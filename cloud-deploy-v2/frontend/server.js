var h=require('http'),fs=require('fs'),p=require('path');
var dir=__dirname;
var BACKEND = 'http://localhost:8080';
var TEXT    = 'http://localhost:8081';
var SWORD   = 'http://localhost:8086';
var AUTH    = 'http://localhost:8084';

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

  // Proxy /api/v1/auth/* to Auth service (:8084)
  if (url.startsWith('/api/v1/auth/')) {
    proxy(AUTH, rq, rs); return;
  }

  // Proxy /api/v1/sword/* to Sword service (:8086)
  if (url.startsWith('/api/v1/sword/') || url.startsWith('/api/v1/strongs/sword/')) {
    proxy(SWORD, rq, rs); return;
  }

  // Proxy /api/v1/text/repos — read/write repos.json
  if (url === '/api/v1/text/repos') {
    // GET: return repos list
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
    // POST: save custom repos
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

  // Proxy /api/v1/text/* to Text service (:8081) — bookmarks/notes
  if (url.startsWith('/api/v1/text/')) {
    proxy(TEXT, rq, rs); return;
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