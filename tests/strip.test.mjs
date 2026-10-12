import test from 'node:test';
import assert from 'node:assert/strict';
import {stripMetrics} from '../public/strip.js';
test('Normal pages stay intact; tall webtoon images get readable, overlapping sections',()=>{
 assert.equal(stripMetrics(720,1100,500,600).total,1);
 const metrics=stripMetrics(720,4000,500,600);assert.ok(metrics.total>1);assert.ok(metrics.step<600);assert.equal(metrics.maxOffset,4000*500/720-600);assert.ok((metrics.total-1)*metrics.step>=metrics.maxOffset);
});
test('Strip sizing handles unloaded frames and smaller phone screens',()=>{
 assert.equal(stripMetrics(0,0,0,0).total,1);const desktop=stripMetrics(720,4000,570,430),phone=stripMetrics(720,4000,360,650);assert.ok(desktop.total>phone.total);assert.ok(phone.total>=3);
});
