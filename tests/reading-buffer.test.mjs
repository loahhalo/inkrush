import test from 'node:test';
import assert from 'node:assert/strict';
import {lookAhead,bufferPlan,ChapterPageCache} from '../platform/components/reading-buffer.ts';
test('look-ahead respects Data Saver and slow networks with bounded page order',()=>{
  assert.equal(lookAhead(),3);assert.equal(lookAhead({saveData:true}),0);assert.equal(lookAhead({effectiveType:'slow-2g'}),0);assert.equal(lookAhead({effectiveType:'2g'}),0);assert.equal(lookAhead({effectiveType:'3g'}),1);
  assert.deepEqual(bufferPlan(10,4,3),[5,6,7,3]);assert.deepEqual(bufferPlan(10,9,3),[8]);assert.deepEqual(bufferPlan(10,0,3),[1,2,3]);assert.deepEqual(bufferPlan(10,3,0),[]);
});
test('chapter prefetch and navigation share one request and explicit retry refreshes it',async()=>{
  const cache=new ChapterPageCache();let calls=0;const loader=async()=>{calls++;return {pages:['a','b']};};
  const a=cache.load('chapter',loader),b=cache.load('chapter',loader);assert.equal(a,b);await a;assert.equal(calls,1);
  await cache.load('chapter',loader);assert.equal(calls,1);await cache.load('chapter',loader,true);assert.equal(calls,2);
});
test('chapter cache expires, evicts least-recently-used entries and retries failures',async()=>{
  let now=0,calls=0;const cache=new ChapterPageCache(2,10,()=>now);const loader=async()=>++calls;
  await cache.load('a',loader);await cache.load('b',loader);await cache.load('a',loader);await cache.load('c',loader);await cache.load('b',loader);assert.equal(calls,4);
  now=11;await cache.load('b',loader);assert.equal(calls,5);
  await assert.rejects(cache.load('bad',async()=>{throw Error('offline');}));assert.equal(await cache.load('bad',loader),6);
});
