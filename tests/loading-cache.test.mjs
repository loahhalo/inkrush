import test from 'node:test';
import assert from 'node:assert/strict';
import {CatalogSnapshots} from '../platform/components/catalog-snapshots.ts';
import {LiveFeedCache} from '../platform/server/live-feed.ts';
import {readComicDetail} from '../platform/components/comic-cache.ts';

const feed=title=>({comics:[{id:title,title,cover:'/api/proxy/image?url=test'}],hasNextPage:false,partial:false});
test('device snapshots isolate preferences and language, survive reload and expire',()=>{
  let saved,now=100;const store={getItem:()=>saved||null,setItem:(_key,value)=>saved=value};const cache=new CatalogSnapshots(()=>store,()=>now);
  cache.set('en-safe',feed('English'));cache.set('id-safe',feed('Indonesia'));assert.equal(cache.get('en-safe').comics[0].title,'English');assert.equal(cache.get('en-adult'),null);
  const reload=new CatalogSnapshots(()=>store,()=>now);assert.equal(reload.get('id-safe').comics[0].title,'Indonesia');now+=1800001;assert.equal(reload.get('en-safe'),null);
});
test('snapshot bounds and unavailable device storage do not break cards or persist searches',()=>{
  let saved;const store={getItem:()=>null,setItem:(_key,value)=>saved=value};const cache=new CatalogSnapshots(()=>store);cache.set('search',feed('query'),false);cache.set('browse',feed('browse'));assert.equal(JSON.parse(saved).some(([key])=>key==='search'),false);
  for(let i=0;i<10;i++)cache.set('feed'+i,feed(String(i)));assert.equal(cache.get('feed0'),null);assert.equal(cache.get('feed9').comics.length,1);
  const blocked=new CatalogSnapshots(()=>{throw Error('Storage denied');});blocked.set('a',feed('still usable'));assert.equal(blocked.get('a').comics[0].title,'still usable');
});
test('expired server feeds return cards immediately while one refresh remains pending',async()=>{
  let now=0,calls=0,finish;const cache=new LiveFeedCache({now:()=>now});await cache.read('a',async()=>feed('first'));now=300001;
  const loader=()=>{calls++;return new Promise(resolve=>finish=resolve);};const returned=await cache.read('a',loader);assert.equal(returned.value.comics[0].title,'first');assert.equal(returned.refreshing,true);await cache.read('a',loader);assert.equal(calls,1);finish(feed('updated'));await new Promise(resolve=>setImmediate(resolve));assert.equal((await cache.read('a',loader)).value.comics[0].title,'updated');
});
test('title views share a chapter list, coalesce concurrent loads, isolate languages and allow explicit retry',async()=>{
  const fetcher=globalThis.fetch,location=globalThis.location;let calls=0;globalThis.location={origin:'https://reader.test'};globalThis.fetch=async()=>{calls++;return Response.json({id:'loading-cache-test',language:'en',chapters:[]});};
  try{await Promise.all([readComicDetail('loading-cache-test','en'),readComicDetail('loading-cache-test','en')]);assert.equal(calls,1);await readComicDetail('loading-cache-test','en');assert.equal(calls,1);await readComicDetail('loading-cache-test','id');assert.equal(calls,2);await readComicDetail('loading-cache-test','en',true);assert.equal(calls,3);}finally{globalThis.fetch=fetcher;if(location===undefined)delete globalThis.location;else globalThis.location=location;}
});
