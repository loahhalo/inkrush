import test from 'node:test';
import assert from 'node:assert/strict';
import {CoverImages,coverMangaId,trustedCover} from '../platform/server/cover-images.ts';
import {proxyTicket,imageUrl} from '../platform/server/image-proxy.ts';

const ids=['91d928a1-7237-4d03-abc3-4b1440cc7d55','6ad54367-4165-43ed-9a7d-71179c520180'];
const path=id=>'https://uploads.mangadex.org/covers/'+id+'/cover.jpg.256.jpg';
const artwork=id=>'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/'+id+'.jpg';
test('fallback only accepts real cover paths and vetted metadata image hosts',()=>{
  assert.equal(coverMangaId(path(ids[0])),ids[0]);assert.equal(coverMangaId('https://uploads.mangadex.org.evil.test/covers/'+ids[0]+'/cover.jpg'),null);
  for(const url of ['http://uploads.mangadex.org/covers/'+ids[0]+'/cover.jpg','https://uploads.mangadex.org:99/covers/'+ids[0]+'/cover.jpg','https://user@uploads.mangadex.org/covers/'+ids[0]+'/cover.jpg'])assert.equal(coverMangaId(url),null);
  assert.equal(trustedCover(artwork(1)),true);assert.equal(trustedCover('https://cdn.myanimelist.net/images/manga/1/2.jpg'),true);
  for(const url of ['https://evil.test/cover.jpg','https://s4.anilist.co.evil.test/file/anilistcdn/media/manga/cover/a.jpg','https://s4.anilist.co/anything','http://s4.anilist.co/file/anilistcdn/media/manga/cover/a.jpg'])assert.equal(trustedCover(url),false);
});
test('concurrent cover metadata lookups batch exact IDs, coalesce duplicates and cache the artwork',async()=>{
  const requests=[];const covers=new CoverImages({fetcher:async(input,init)=>{requests.push(String(input));if(String(input).startsWith('https://api.mangadex.org/manga?')){assert.deepEqual(new URL(input).searchParams.getAll('ids[]'),ids);return Response.json({data:ids.map((id,i)=>({id,attributes:{links:{al:String(i+10)}}}))});}const body=JSON.parse(init.body);assert.deepEqual(body.variables.ids,[10,11]);assert.equal(body.query.includes('search:'),false);return Response.json({data:{Page:{media:[10,11].map(id=>({id,coverImage:{large:artwork(id)}}))}}});}});
  assert.deepEqual(await Promise.all([covers.resolve(ids[0]),covers.resolve(ids[1]),covers.resolve(ids[0])]),[artwork(10),artwork(11),artwork(10)]);assert.equal(requests.length,2);assert.equal(await covers.resolve(ids[0]),artwork(10));assert.equal(requests.length,2);
});
test('blocked primary covers stream exact-ID fallback artwork through authenticated same-origin tickets',async()=>{
  const original=globalThis.fetch;let primary=0;globalThis.fetch=async(input,init)=>{const url=String(input);if(url.startsWith('https://uploads.mangadex.org/')){primary++;return new Response(null,{status:403});}if(url.startsWith('https://api.mangadex.org/manga?'))return Response.json({data:[{id:ids[0],attributes:{links:{al:'179256'}}}]});if(url==='https://graphql.anilist.co')return Response.json({data:{Page:{media:[{id:179256,coverImage:{large:artwork(179256)}}]}}});assert.equal(url,artwork(179256));assert.equal(init.redirect,'manual');return new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}});};
  try{const response=await proxyTicket(new Request('https://reader.test'+imageUrl(path(ids[0]))));assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/jpeg');assert.equal(response.headers.has('X-Upstream-Status'),false);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[255,216,255]);const cached=await proxyTicket(new Request('https://reader.test'+imageUrl(path(ids[0]))));assert.equal(cached.headers.get('X-Image-Cache'),'HIT');assert.equal(primary,1);}finally{globalThis.fetch=original;}
});
test('missing mappings retry after a short negative cache instead of permanently poisoning a cover',async()=>{
  let now=0,calls=0;const covers=new CoverImages({now:()=>now,fetcher:async()=>{calls++;return Response.json({data:[]});}});assert.equal(await covers.resolve(ids[1]),null);assert.equal(await covers.resolve(ids[1]),null);assert.equal(calls,1);now=30001;assert.equal(await covers.resolve(ids[1]),null);assert.equal(calls,2);
});
