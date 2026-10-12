import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import manifest from '../platform/app/manifest.ts';
import {swipeAction,wheelChapter} from '../platform/components/reader-gestures.ts';

test('original swipe contract: left/right change page, up/down change chapter',()=>{
  assert.deepEqual(swipeAction(-180,12),{kind:'page',delta:1});
  assert.deepEqual(swipeAction(180,-12),{kind:'page',delta:-1});
  assert.deepEqual(swipeAction(10,-180),{kind:'chapter',delta:1});
  assert.deepEqual(swipeAction(-10,180),{kind:'chapter',delta:-1});
  assert.equal(swipeAction(10,10),null);assert.equal(swipeAction(-120,-120),null);
});
test('wheel accumulation changes chapter once and ignores inertial events during cooldown',()=>{
  const state={total:0,last:0,lock:0};
  assert.equal(wheelChapter(state,80,1000),0);assert.equal(wheelChapter(state,80,1050),1);
  assert.equal(wheelChapter(state,400,1100),0);assert.equal(wheelChapter(state,-160,2200),-1);
  assert.equal(wheelChapter(state,-400,2250),0);
});
test('Android manifest provides standalone launch, stable app identity and correctly sized PNG icons',async()=>{
  const data=manifest();assert.equal(data.id,'/');assert.equal(data.scope,'/');assert.equal(data.display,'standalone');
  assert.match(data.start_url,/#discover$/);assert.equal(data.prefer_related_applications,false);
  for(const icon of data.icons){const bytes=await fs.readFile(new URL('../platform/public'+icon.src,import.meta.url));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');const [w,h]=icon.sizes.split('x').map(Number);
    assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);
  }
  assert.ok(data.icons.some(i=>i.purpose==='maskable'));
});
test('offline worker ignores API/image proxy responses and falls back for offline navigation',async()=>{
  const handlers={};const offline=new Response('Offline shell');let handled=false,result;
  const context={URL,Response,fetch:async()=>{throw new Error('offline');},caches:{match:async()=>offline},self:{location:{origin:'https://reader.test'},addEventListener:(event,fn)=>{handlers[event]=fn;}}};
  vm.runInNewContext(await fs.readFile(new URL('../platform/public/sw.js',import.meta.url),'utf8'),context);
  handlers.fetch({request:{method:'GET',url:'https://reader.test/api/proxy/image?url=opaque'},respondWith:()=>{handled=true;}});assert.equal(handled,false);
  handlers.fetch({request:{method:'GET',url:'https://reader.test/#read',mode:'navigate'},respondWith:promise=>{result=promise;}});
  assert.equal(await (await result).text(),'Offline shell');
});

test('device storage failure does not break online app assets',async()=>{
  const handlers={};let result;
  const context={URL,Response,fetch:async()=>new Response('app chunk'),caches:{open:async()=>{throw new Error('Device storage is unavailable');}},self:{location:{origin:'https://reader.test'},addEventListener:(event,fn)=>{handlers[event]=fn;}}};
  vm.runInNewContext(await fs.readFile(new URL('../platform/public/sw.js',import.meta.url),'utf8'),context);
  handlers.fetch({request:{method:'GET',url:'https://reader.test/_next/static/chunk.js'},respondWith:promise=>{result=promise;}});
  assert.equal(await (await result).text(),'app chunk');
});
