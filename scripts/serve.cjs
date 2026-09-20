const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../index.html');
const port = Number(process.env.PORT || 8765);
http.createServer((req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  if (!['/', '/index.html'].includes(route)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(500); res.end('Run npm run build first'); return; }
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'});
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('Откройте http://127.0.0.1:'+port+' (остановка: Ctrl+C)'));
