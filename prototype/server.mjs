// Throwaway UI prototype. No build step or dependencies.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer(async(req,res)=>{
  const url = new URL(req.url,'http://localhost');
  const name = url.pathname === '/' || url.pathname === '/prototype/' ? 'index.html' : url.pathname.replace(/^\//,'');
  const file = path.resolve(root,name);
  if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
  try {let data=await readFile(file); if(name==='index.html' && process.env.NODE_ENV==='production') data=Buffer.from(data.toString().replace('data-prototype="true"','data-prototype="false"')); res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}
  catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT||4317),'127.0.0.1',()=>console.log('Open Foundation Model Training prototype: http://localhost:'+(process.env.PORT||4317)));
