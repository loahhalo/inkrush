import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import https from 'node:https';
import {Readable} from 'node:stream';
import {seal,unseal} from './identity.ts';
import {proxyImage} from '../../lib/mangadex-image.mjs';
import {proxyWebtoonImage} from '../../lib/webtoons.mjs';
import {handleGatewayImage} from '../../lib/gateway.mjs';

type ImageTicket={path:string};
export function imageUrl(path:string){if(!path)return '';return '/api/proxy/image?url='+encodeURIComponent(seal('i',{path}));}
export function isPublicAddress(address:string){if(isIP(address)===4){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a>=224||a===198&&(b===18||b===19));}if(isIP(address)===6)return !/^(?:::|::1$|f[cd]|fe[89ab]|ff)/i.test(address)&&!address.toLowerCase().startsWith('::ffff:');return false;}
// Direct CDN requests are only made for server-issued, authenticated tickets.
// DNS is checked and pinned to prevent redirects/rebinding to private networks.
async function publicImage(target:URL,referer:string){if(target.protocol!=='https:'||target.port||target.username||target.password)throw new Error('Invalid image');const addresses=await lookup(target.hostname,{all:true});if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new Error('Invalid image');const pinned=addresses[0];return new Promise<Response>((resolve,reject)=>{const request=https.get(target,{headers:{Referer:referer,'User-Agent':'Mozilla/5.0 (compatible; INKRUSH/2.0)'},lookup:(_host,_options,cb)=>cb(null,pinned.address,pinned.family)},upstream=>{const type=String(upstream.headers['content-type']||'');if(upstream.statusCode!==200||!/^image\/(?:jpeg|png|webp|gif|avif)(?:;|$)/i.test(type)||Number(upstream.headers['content-length']||0)>32*1024*1024){upstream.destroy();reject(new Error('Image unavailable'));return;}let size=0;upstream.on('data',chunk=>{size+=chunk.length;if(size>32*1024*1024)upstream.destroy(new Error('Image too large'));});resolve(new Response(Readable.toWeb(upstream) as ReadableStream,{headers:{'Content-Type':type,'Cache-Control':'private, max-age=900','X-Content-Type-Options':'nosniff'}}));});request.setTimeout(25000,()=>request.destroy(new Error('Image timeout')));request.on('error',reject);});}
export async function proxyTicket(request:Request){let path:string;try{path=unseal<ImageTicket>('i',new URL(request.url).searchParams.get('url')||'').path;}catch{return new Response('Invalid image request',{status:400});}
  try{const url=new URL(path,'https://internal');let response:Response;
    if(url.origin==='https://internal'&&url.pathname==='/api/gateway-image')response=await handleGatewayImage(new Request(url));
    else if(url.origin==='https://internal'&&url.pathname==='/api/mangadex-image')response=await proxyImage(new Request(url));
    else if(url.origin==='https://internal'&&url.pathname==='/api/webtoon-image')response=await proxyWebtoonImage(new Request(url));
    else if(url.hostname==='uploads.mangadex.org')response=await proxyImage(new Request('https://internal/api/mangadex-image?url='+encodeURIComponent(path)));
    else return new Response('Invalid image request',{status:400});
    if(!response.ok)return new Response('This page is temporarily unavailable',{status:502});
    const headers=new Headers(response.headers);headers.set('Cache-Control','private, max-age=900');headers.set('X-Content-Type-Options','nosniff');return new Response(response.body,{status:200,headers});
  }catch{return new Response('This page is temporarily unavailable',{status:502});}
}
// Exported for vetted direct-CDN provider adapters; callers never supply their own referrer.
export const streamProviderImage=publicImage;
