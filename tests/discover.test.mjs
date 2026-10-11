import test from 'node:test';
import assert from 'node:assert/strict';
import {rankSuggestions,rememberTitle} from '../public/search.js';
import {MangaDexClient,normalizeChapters} from '../public/mangadex.js';
test('Predictions rank exact and prefix matches, accents, and minor typos',()=>{
 const items=[{id:'1',title:'One Piece'},{id:'2',title:'The One'},{id:'3',title:'One'},{id:'4',title:'Café Moon'}];
 assert.deepEqual(rankSuggestions(items,'one').map(m=>m.id),['3','1','2']);assert.equal(rankSuggestions(items,'cafe')[0].id,'4');assert.equal(rankSuggestions(items,'peice').length,0);assert.equal(rankSuggestions(items,'piec')[0].id,'1');assert.equal(rankSuggestions(items,'nothing').length,0);
});
test('Suggestions adapt within relevance tiers, stay source-scoped, and bound history',()=>{
 const items=[{id:'a',title:'Moon Alpha'},{id:'b',title:'Moon Beta'}];let history=[];for(let i=0;i<5;i++)history=rememberTitle(history,items[1],'dex',1000+i);
 assert.equal(rankSuggestions(items,'moon',history,'dex',1005)[0].id,'b');assert.equal(rankSuggestions(items,'moon',history,'other',1005)[0].id,'a');assert.equal(history.length,1);assert.equal(history[0].visits,5);
 for(let i=0;i<80;i++)history=rememberTitle(history,{id:i,title:'Title '+i},'dex');assert.equal(history.length,60);
 assert.equal(rankSuggestions([...items,...items],'moon').length,2);
});
test('Trending, New and search send distinct catalog requests and cancellation signals',async()=>{
 const client=new MangaDexClient(),calls=[];client.request=async(path,params,signal)=>{calls.push({params,signal});return {data:[],offset:0,limit:18,total:0};};const controller=new AbortController();
 await client.browse('en','',1,{category:'trending',signal:controller.signal});assert.equal(calls[0].params['order[followedCount]'],'desc');assert.match(calls[0].params.createdAtSince,/^\d{4}-\d{2}-\d{2}T/);assert.equal(calls[0].signal,controller.signal);
 await client.browse('en','',1,{category:'new'});assert.equal(calls[1].params['order[createdAt]'],'desc');assert.equal(calls[1].params.createdAtSince,undefined);
 await client.browse('en','Moon',2,{category:'trending'});assert.equal(calls[2].params['order[relevance]'],'desc');assert.equal(calls[2].params.createdAtSince,undefined);assert.equal(calls[2].params.offset,18);
});
test('Missing volume duplicates, decimals, and unnumbered specials retain correct positions and aliases',()=>{
 const make=(id,chapter,volume,title)=>({id,attributes:{chapter,volume,title,pages:12,publishAt:'2020-01-01'}});
 const entries=[make('special',null,null,'Extra'),make('late','65',null),make('first','1','1'),make('duplicate','01',null),make('half','1.5','1')];
 const chapters=normalizeChapters(entries);assert.deepEqual(chapters.map(c=>c.id),['duplicate','half','late','special']);assert.deepEqual(chapters[0].alternativeIds,['first']);assert.equal(chapters[3].chapterNumber,null);
 assert.equal(entries[0].id,'special');
 const reset=normalizeChapters([make('v1','1','1'),make('v2','1','2')]);assert.equal(reset.length,2);
});
