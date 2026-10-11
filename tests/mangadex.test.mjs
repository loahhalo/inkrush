import test from 'node:test';
import assert from 'node:assert/strict';
import { MangaDexClient, normalizeChapters } from '../public/mangadex.js';
import { proxyMangaDex } from '../lib/mangadex-proxy.mjs';
import { proxyImage } from '../lib/mangadex-image.mjs';
test('MangaDex chapters sort, deduplicate, and omit external/empty entries',()=>{
 const make=(id,chapter,extra={})=>({id,attributes:{volume:'1',chapter,pages:20,publishAt:'2020-01-01',...extra}});
 assert.deepEqual(normalizeChapters([make('two','2'),make('one','1'),make('duplicate','1'),make('external','3',{externalUrl:'https://example.com'}),make('empty','4',{pages:0})]).map(c=>c.id),['one','two']);
});
test('Page cache refreshes image locations and uses same-origin requests',async()=>{
 const client=new MangaDexClient();let requests=0;
 client.request=async()=>{requests++;return {baseUrl:'https://cdn.mangadex.network',chapter:{hash:'abcdef',dataSaver:['page.jpg']}};};
 const pages=await client.pages('chapter');assert.match(pages[0],/^\/api\/mangadex-image\?url=/);assert.equal(client.image(pages[0]),pages[0]);await client.pages('chapter');assert.equal(requests,1);await client.pages('chapter',true);assert.equal(requests,2);
});
test('Chapters without volume labels stay in chapter-number order',()=>{
 const make=(id,chapter,volume)=>({id,attributes:{chapter,volume,pages:20,publishAt:'2020-01-01'}});
 const entries=[make('late','65',null),make('first','1','1'),make('second','2','1')];
 assert.deepEqual(normalizeChapters([...entries]).map(c=>c.id),['first','second','late']);
 assert.deepEqual(normalizeChapters([...entries],true).map(c=>c.id),['late','first','second']);
});
test('Proxies reject unrelated targets before fetching',async()=>{
 assert.equal((await proxyMangaDex(new Request('https://reader.test/api'),['admin'])).status,404);
 for(const url of ['https://example.com/page.jpg','http://uploads.mangadex.org/covers/a/b.jpg','https://uploads.mangadex.org.evil.test/covers/a/b.jpg','https://user:secret@uploads.mangadex.org/covers/a/b.jpg'])assert.equal((await proxyImage(new Request('https://reader.test/api/mangadex-image?url='+encodeURIComponent(url)))).status,400);
});
test('Image proxy streams images and refuses redirects',async()=>{
 const original=globalThis.fetch;const req=new Request('https://reader.test/api/mangadex-image?url='+encodeURIComponent('https://cdn.mangadex.network/data-saver/abcdef/page.jpg'));
 try{globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual');return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/jpeg'}});};const response=await proxyImage(req);assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,3);globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://example.com'}});assert.equal((await proxyImage(req)).status,502);}finally{globalThis.fetch=original;}
});
