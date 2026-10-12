import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {handleGateway,handleGatewayImage} from '../lib/gateway.mjs';
import {handleTrending,handleTrendingSync} from '../lib/trending.mjs';
import {proxyMangaDex} from '../lib/mangadex-proxy.mjs';
import {proxyImage} from '../lib/mangadex-image.mjs';
import {handleWebtoons,proxyWebtoonImage} from '../lib/webtoons.mjs';

const root=path.resolve(import.meta.dirname,'../public');
const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
const routes=new Map([
  ['/api/gateway',handleGateway],['/api/gateway-image',handleGatewayImage],
  ['/api/trending',handleTrending],['/api/trending-sync',handleTrendingSync],
  ['/api/webtoons',handleWebtoons],['/api/webtoon-image',proxyWebtoonImage],
  ['/api/mangadex-image',proxyImage]
]);
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://reader.internal');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
    let response;
    if(url.pathname==='/healthz')response=Response.json({status:'ok'});
    else if(routes.has(url.pathname))response=await routes.get(url.pathname)(new Request(url,{method:req.method,headers:req.headers}));
    else if(url.pathname.startsWith('/api/mangadex/'))response=await proxyMangaDex(new Request(url,{method:req.method,headers:req.headers}),url.pathname.slice('/api/mangadex/'.length).split('/'));
    else if(url.pathname.startsWith('/api/'))response=new Response('Not found',{status:404});
    else{
      const pathname=decodeURIComponent(url.pathname==='/'||url.pathname==='/reader'?'/reader.html':url.pathname);
      const file=path.resolve(root,'.'+pathname);
      if(!file.startsWith(root+path.sep)||pathname.includes('\\')){res.writeHead(403).end();return;}
      const content=await fs.readFile(file);
      response=new Response(req.method==='HEAD'?null:content,{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=0, must-revalidate'}});
    }
    res.writeHead(response.status,{...Object.fromEntries(response.headers),'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
    if(req.method==='HEAD'||!response.body)res.end();
    else await pipeline(Readable.fromWeb(response.body),res);
  }catch(error){
    if(!res.headersSent)res.writeHead(error.code==='ENOENT'||error.code==='EISDIR'?404:error instanceof URIError?400:502,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end('Unable to serve this request.');
    else res.destroy();
  }
}).listen(port,'0.0.0.0',()=>console.log('INKRUSH listening on port '+port));
