import test from 'node:test';
import assert from 'node:assert/strict';
import {ImageResponseCache} from '../platform/server/image-cache.ts';
const image=text=>new Response(text,{headers:{'Content-Type':'image/jpeg'}});

test('image cache streams the first chunk before upstream completes and coalesces other readers',async()=>{
  const cache=new ImageResponseCache();let calls=0,source;
  const load=async()=>{calls++;return new Response(new ReadableStream({start(c){source=c;}}),{headers:{'Content-Type':'image/jpeg'}});};
  const cold=await cache.load('page',load),reader=cold.body.getReader();
  assert.equal(cold.headers.get('x-image-cache'),'MISS');
  source.enqueue(new TextEncoder().encode('first'));
  assert.equal(new TextDecoder().decode((await reader.read()).value),'first');
  const concurrent=cache.load('page',load);
  source.enqueue(new TextEncoder().encode('last'));source.close();
  while(!(await reader.read()).done){}
  const shared=await concurrent;
  assert.equal(await shared.text(),'firstlast');assert.equal(shared.headers.get('x-image-cache'),'COALESCED');assert.equal(calls,1);
  const warm=await cache.load('page',load);assert.equal(await warm.text(),'firstlast');assert.equal(warm.headers.get('x-image-cache'),'HIT');assert.equal(calls,1);
});
test('image cache evicts by bytes/LRU and expires stale files',async()=>{
  let now=0,calls=0;const cache=new ImageResponseCache({maxBytes:6,maxImageBytes:6,ttlMs:10,now:()=>now});
  const read=async key=>(await cache.load(key,async()=>{calls++;return image(key.repeat(3));})).text();
  await read('a');await read('b');await read('a');await read('c');assert.equal(calls,3);
  await read('b');assert.equal(calls,4);now=11;await read('b');assert.equal(calls,5);
});
test('failed, cancelled and oversized images are not retained, and retry bypasses cached data',async()=>{
  const cache=new ImageResponseCache({maxImageBytes:4});let calls=0;
  const failed=async()=>{calls++;return new Response('failed',{status:502});};await (await cache.load('fail',failed)).text();await (await cache.load('fail',failed)).text();assert.equal(calls,2);
  const large=async()=>{calls++;return image('large');};await (await cache.load('large',large)).text();await (await cache.load('large',large)).text();assert.equal(calls,4);
  const cancelled=async()=>{calls++;return image('tiny');};const c=await cache.load('cancel',cancelled);await c.body.cancel();await (await cache.load('cancel',cancelled)).text();assert.equal(calls,6);
  await (await cache.load('retry',()=>Promise.resolve(image('old')))).text();assert.equal(await (await cache.load('retry',()=>Promise.resolve(image('new')),true)).text(),'new');
});
test('stream errors and loader rejection cannot poison the cache or leave pending readers stuck',async()=>{
  const cache=new ImageResponseCache();await assert.rejects(cache.load('fail',async()=>{throw Error('offline');}));
  const broken=await cache.load('fail',async()=>new Response(new ReadableStream({start(c){c.error(Error('truncated'));}}),{headers:{'Content-Type':'image/jpeg'}}));await assert.rejects(broken.text());
  assert.equal(await (await cache.load('fail',()=>Promise.resolve(image('ok')))).text(),'ok');
});
test('real upstream image/jpg aliases are normalized and incomplete bodies are never cached',async()=>{
  const cache=new ImageResponseCache();const loader=async()=>new Response('jpg',{headers:{'Content-Type':'image/jpg'}});
  const cold=await cache.load('alias',loader);assert.equal(cold.headers.get('content-type'),'image/jpeg');await cold.text();assert.equal((await cache.load('alias',loader)).headers.get('x-image-cache'),'HIT');
  const truncated=async()=>new Response('short',{headers:{'Content-Type':'image/jpeg','Content-Length':'99'}});
  await (await cache.load('truncated',truncated)).text();assert.equal((await cache.load('truncated',truncated)).headers.get('x-image-cache'),'MISS');
});
