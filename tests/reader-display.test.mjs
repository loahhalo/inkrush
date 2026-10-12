import test from 'node:test';
import assert from 'node:assert/strict';
import {clampZoom,pinchZoom,clampPan,enterFullscreen,leaveFullscreen} from '../platform/components/reader-display.ts';

test('zoom stays between fitted size and 300%, including pinch gestures',()=>{
  assert.equal(clampZoom(.1),1);assert.equal(clampZoom(10),3);assert.equal(clampZoom(NaN),1);
  assert.equal(pinchZoom(1,100,200),2);assert.equal(pinchZoom(2,200,50),1);
  assert.equal(pinchZoom(2,100,300),3);assert.equal(pinchZoom(1.5,0,100),1.5);
});
test('zoomed portrait pages pan only where image content exceeds the canvas',()=>{
  // 800x1200 image fits into 600x300 as 200x300. At 2x it only overflows vertically.
  assert.deepEqual(clampPan({x:500,y:500},2,600,300,800,1200),{x:0,y:150});
  assert.deepEqual(clampPan({x:-500,y:-500},2,600,300,800,1200),{x:0,y:-150});
  assert.deepEqual(clampPan({x:100,y:100},1,600,300,800,1200),{x:0,y:0});
});
test('long-page sections pan within the magnified section and never beyond its edges',()=>{
  assert.deepEqual(clampPan({x:999,y:-999},2,600,400,720,4000,true),{x:300,y:-200});
  assert.deepEqual(clampPan({x:50,y:50},2,0,0,0,0),{x:0,y:0});
});
test('native fullscreen uses the persistent document and handles unavailable browsers',async()=>{
  let calls=0;const element={requestFullscreen:async options=>{assert.equal(options.navigationUI,'hide');calls++;}};
  assert.equal(await enterFullscreen({fullscreenEnabled:true,fullscreenElement:null,documentElement:element}),true);
  assert.equal(calls,1);
  assert.equal(await enterFullscreen({fullscreenEnabled:false,fullscreenElement:null,documentElement:element}),false);
  assert.equal(calls,1);
  assert.equal(await enterFullscreen({fullscreenEnabled:true,fullscreenElement:null,documentElement:{requestFullscreen:async()=>{throw new Error('denied');}}}),false);
});
test('leaving fullscreen affects only the reader-owned document element',async()=>{
  let calls=0;const element={};const doc={fullscreenElement:element,documentElement:element,exitFullscreen:async()=>{calls++;}};
  await leaveFullscreen(doc);assert.equal(calls,1);
  await leaveFullscreen({...doc,fullscreenElement:{}});assert.equal(calls,1);
  await leaveFullscreen({...doc,exitFullscreen:async()=>{throw new Error('already exited');}});
});
