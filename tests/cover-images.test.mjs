import test from 'node:test';
import assert from 'node:assert/strict';
import {CoverImages,coverMangaId} from '../platform/server/cover-images.ts';
import {proxyTicket,imageUrl} from '../platform/server/image-proxy.ts';
const id='91d928a1-7237-4d03-abc3-4b1440cc7d55';
const path='https://uploads.mangadex.org/covers/'+id+'/cover.jpg.256.jpg';
test('original cover routing only accepts exact source cover URLs',()=>{
  assert.equal(coverMangaId(path),id);
  for(const url of ['https://uploads.mangadex.org.evil.test/covers/'+id+'/cover.jpg','http://uploads.mangadex.org/covers/'+id+'/cover.jpg','https://uploads.mangadex.org:99/covers/'+id+'/cover.jpg','https://user@uploads.mangadex.org/covers/'+id+'/cover.jpg',path+'?url=https://evil.test',path+'#fragment'])assert.equal(coverMangaId(url),null);
});
test('blocked original covers use identical source URL and bytes through the existing relay, then cache locally',async()=>{
  const original=globalThis.fetch;let primary=0,relay=0;const artwork=new Uint8Array([255,216,255,42]);
  globalThis.fetch=async(input,init)=>{const url=new URL(input);if(url.hostname==='uploads.mangadex.org'){primary++;return new Response(null,{status:403});}assert.equal(url.origin+url.pathname,'https://inkrush-mu.vercel.app/api/mangadex-image');assert.equal(url.searchParams.get('url'),path);assert.equal(init.redirect,'manual');relay++;return new Response(artwork,{headers:{'Content-Type':'image/jpeg'}});};
  try{const response=await proxyTicket(new Request('https://reader.test'+imageUrl(path)));assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),artwork);assert.equal(response.headers.has('X-Upstream-Status'),false);const cached=await proxyTicket(new Request('https://reader.test'+imageUrl(path)));assert.equal(cached.headers.get('X-Image-Cache'),'HIT');assert.equal(primary,1);assert.equal(relay,1);}finally{globalThis.fetch=original;}
});
test('a working source cover streams directly without any artwork metadata lookup',async()=>{
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async input=>{calls++;assert.equal(String(input),path);return new Response('original',{headers:{'Content-Type':'image/png'}});};
  try{const covers=new CoverImages({fetcher:async()=>{throw Error('Relay should not run');}});assert.equal(await (await covers.load(path)).text(),'original');assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
test('relay redirects and non-image responses fail without substituting artwork',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response(null,{status:403});
  try{for(const response of [new Response(null,{status:302,headers:{Location:'https://evil.test'}}),new Response('HTML',{headers:{'Content-Type':'text/html'}}),new Response('large',{headers:{'Content-Type':'image/jpeg','Content-Length':String(9*1024*1024)}})]){const covers=new CoverImages({fetcher:async()=>response});assert.equal((await covers.load(path)).status,502);}}finally{globalThis.fetch=original;}
});
