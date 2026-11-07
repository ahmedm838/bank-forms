import http from 'http'; import fs from 'fs'; import path from 'path';
import { fileURLToPath } from 'url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.pdf':'application/pdf','.ttf':'font/ttf','.txt':'text/plain'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method==='POST' && p==='/__save'){ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ fs.writeFileSync(path.join(root,'test-output.pdf'), Buffer.from(b,'base64')); res.writeHead(200); res.end('ok'); }); return; }
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
}).listen(8755, ()=>console.log('http://localhost:8755'));
