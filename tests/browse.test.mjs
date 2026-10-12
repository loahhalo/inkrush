import test from 'node:test';
import assert from 'node:assert/strict';
import {bookmarkIndex,chapterRows,latestChapterIndex} from '../public/browse-core.js';
import {MangaDexClient} from '../public/mangadex.js';

const chapters=[{id:'one',chapterNumber:'1',name:'Beginning',publishedAt:'2025-01-01'},{id:'two',alternativeIds:['other-two'],chapterNumber:'2',name:'Storm',publishedAt:'2025-01-03'},{id:'half',chapterNumber:'2.5',name:'After the storm',publishedAt:'2025-01-02'},{id:'extra',chapterNumber:null,name:'Special',publishedAt:'2025-01-04'}];
test('Chapter search and sorting preserve original reader indexes',()=>{
 assert.deepEqual(chapterRows(chapters,'Chapter 2','desc').map(r=>r.index),[1]);
 assert.deepEqual(chapterRows(chapters,'2.5','desc').map(r=>r.index),[2]);
 assert.deepEqual(chapterRows(chapters,'STORM','asc').map(r=>r.index),[1,2]);
 assert.deepEqual(chapterRows(chapters,'','date').map(r=>r.index),[3,1,2,0]);
 assert.deepEqual(chapterRows(chapters,'missing'),[]);
});
test('Continue resolves alternate IDs, migrated bookmarks, and stale indexes',()=>{
 assert.equal(bookmarkIndex({chapters},{chapterId:'other-two',chapter:0}),1);
 assert.equal(bookmarkIndex({chapters,legacyOrder:['two','one']},{chapter:0}),1);
 assert.equal(bookmarkIndex({chapters},{chapter:99}),3);
 assert.equal(bookmarkIndex({chapters},{}),0);
});
test('Latest reading action selects the newest numbered chapter before specials',()=>{
 assert.equal(latestChapterIndex(chapters),2);
 assert.equal(latestChapterIndex([chapters[3]]),0);
});
test('Discover filters reach the source together with English availability',async()=>{
 const client=new MangaDexClient();let params;
 client.request=async(path,p)=>{assert.equal(path,'/manga');params=p;return {offset:0,limit:18,total:0,data:[]};};
 await client.browse('mangadex-en','',1,{category:'latest',genre:'genre-id',language:'zh',status:'completed'});
 assert.equal(params['order[latestUploadedChapter]'],'desc');assert.equal(params['includedTags[]'],'genre-id');assert.deepEqual(params['originalLanguage[]'],['zh','zh-hk']);assert.equal(params['status[]'],'completed');assert.equal(params['availableTranslatedLanguage[]'],'en');
});
test('Mainstream suggestive titles remain searchable and browsable in both language editions',async()=>{
 const client=new MangaDexClient();client.request=async(path,params)=>{const included=params['contentRating[]'];assert.ok(included.includes('safe'));assert.ok(included.includes('suggestive'));assert.ok(!included.includes('erotica'));assert.ok(!included.includes('pornographic'));return {offset:0,limit:18,total:1,data:[{id:'a1c7c817-4e59-43b7-9365-09675a149a6f',attributes:{title:{en:'One Piece'},description:{},contentRating:'suggestive',tags:[]},relationships:[]}]};};
 for(const source of ['mangadex-en','mangadex-id'])for(const query of ['One Piece','']){const result=await client.browse(source,query,1,{category:'popular'});assert.equal(result.mangas[0].title,'One Piece');assert.equal(result.mangas[0].translatedLanguage,source==='mangadex-id'?'id':'en');}
});
