import test from 'node:test';
import assert from 'node:assert/strict';
import {gesture, serverUrl, imageUrl, orderChapters} from '../public/core.js';
import {ExtensionClient} from '../public/api.js';
test('gesture directions reject taps and ambiguous diagonals',()=>{
 assert.equal(gesture(-100,10),'nextPage');assert.equal(gesture(100,10),'prevPage');assert.equal(gesture(10,-100),'nextChapter');assert.equal(gesture(10,100),'prevChapter');assert.equal(gesture(20,15),null);assert.equal(gesture(100,100),null);
});
test('server URLs normalize and reject executable or credential-bearing URLs',()=>{
 assert.equal(serverUrl('https://reader.example/api/graphql/'),'https://reader.example');assert.throws(()=>serverUrl('javascript:alert(1)'));assert.throws(()=>serverUrl('https://name:secret@reader.example'));assert.equal(imageUrl('/api/page/1','https://reader.example'),'https://reader.example/api/page/1');assert.equal(imageUrl('javascript:alert(1)','https://reader.example'),'');
});
test('chapter order follows the source sequence including unnumbered extras',()=>{
 const chapters=[{id:3,sourceOrder:0},{id:2,sourceOrder:1},{id:1,sourceOrder:2}];assert.deepEqual(orderChapters(chapters).map(c=>c.id),[1,2,3]);assert.equal(chapters[0].id,3);
});
test('Suwayomi adapter carries a full browse → chapters → page flow without losing source IDs',async()=>{
 const original=globalThis.fetch;const calls=[];const id='2499283573021220255';
 globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,options,body});let data;
 if(body.query.startsWith('query'))data={sources:{nodes:[{id,name:'Example source',lang:'en'}]}};
 else if(body.query.includes('FetchSourceMangaInput'))data={fetchSourceManga:{hasNextPage:true,mangas:[{id:41,title:'Example comic',thumbnailUrl:'/api/v1/manga/41/thumbnail'}]}};
 else if(body.query.includes('FetchMangaAndChaptersInput'))data={fetchMangaAndChapters:{manga:{id:41,title:'Example comic',genre:['Adventure']},chapters:[{id:51,name:'Chapter two',sourceOrder:0},{id:50,name:'Chapter one',sourceOrder:1}]}};
 else data={fetchChapterPages:{pages:['/api/v1/manga/41/chapter/1/page/0','https://cdn.example/page2.jpg']}};
 return {ok:true,json:async()=>({data})};};
 try{const client=new ExtensionClient('https://reader.example','test-token');assert.equal((await client.sources())[0].id,id);const browse=await client.browse(id,'city',2);assert.equal(calls[1].body.variables.input.source,id);assert.equal(calls[1].body.variables.input.type,'SEARCH');assert.equal(calls[1].body.variables.input.page,2);assert.equal(browse.mangas[0].poster,'https://reader.example/api/v1/manga/41/thumbnail?token=test-token');const manga=await client.manga(41);assert.equal(manga.chapters[0].id,50);const pages=await client.pages(50);assert.equal(pages[0],'https://reader.example/api/v1/manga/41/chapter/1/page/0?token=test-token');assert.equal(pages[1],'https://cdn.example/page2.jpg');assert.equal(calls[0].options.headers.Authorization,'Bearer test-token');assert.equal(calls[0].options.credentials,undefined);}finally{globalThis.fetch=original;}
});
test('GraphQL errors and empty chapters remain actionable',async()=>{
 const original=globalThis.fetch;const client=new ExtensionClient('https://reader.example');
 try{globalThis.fetch=async()=>({ok:true,json:async()=>({errors:[{message:'Extension unavailable'}]})});await assert.rejects(client.sources(),/Extension unavailable/);globalThis.fetch=async()=>({ok:true,json:async()=>({data:{fetchChapterPages:{pages:[]}}})});await assert.rejects(client.pages(1),/no readable pages/);}finally{globalThis.fetch=original;}
});
