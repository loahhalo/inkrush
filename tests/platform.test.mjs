import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PLATFORM_SIGNING_KEY='test-key-never-used-in-production-32-bytes';
const {seal,unseal}=await import('../platform/server/identity.ts');
const {detectGaps,mergeReleases,sameTitle,MangaAggregatorService,findChapter}=await import('../platform/server/aggregator.ts');
const {proxyTicket,isPublicAddress}=await import('../platform/server/image-proxy.ts');
const ref=(id,number,team='Team A',extra={})=>({provider:'test',provider_internal_id:id,language:'en',chapterNumber:number,name:'Chapter '+number,team,...extra});

test('gap detection preserves decimal chapters and catches a missing beginning',()=>{
  assert.deepEqual(detectGaps([{chapterNumber:1},{chapterNumber:2.5},{chapterNumber:5},{chapterNumber:null}]),[2,3,4]);
  assert.deepEqual(detectGaps([{chapterNumber:4},{chapterNumber:5}]),[1,2,3]);
  assert.deepEqual(detectGaps([{chapterNumber:0},{chapterNumber:1}]),[]);
  assert.equal(detectGaps([{chapterNumber:10000}]).length,300);
});
test('one chronological chapter per number, priority then measured resolution, retains alternatives',()=>{
  const chapters=mergeReleases([ref('a',2),ref('b',1,'Team B',{priority:70,resolution:1000}),ref('c',1,'Team C',{priority:70,resolution:1600}),ref('d',1,'Team D',{priority:40,resolution:2000}),ref('e',1.5)]);
  assert.deepEqual(chapters.map(c=>c.chapterNumber),[1,1.5,2]);
  assert.equal(chapters[0].releases[0].team,'Team C');assert.equal(chapters[0].releases.length,3);
  assert.equal(JSON.stringify(chapters).includes('provider_internal_id'),false);
});
test('exact title aliases match without mixing languages or similarly named sequels',()=>{
  const a={title:'Solo Leveling',altTitles:['Ore dake Level Up'],language:'en'};
  assert.equal(sameTitle(a,{title:'Solo-Leveling',language:'en'}),true);
  assert.equal(sameTitle(a,{title:'Ore dake Level Up',language:'en'}),true);
  assert.equal(sameTitle(a,{title:'Solo Leveling: Ragnarok',language:'en'}),false);
  assert.equal(sameTitle(a,{title:'Solo Leveling',language:'id'}),false);
});
test('opaque stable identifiers authenticate type and reject tampering',()=>{
  const value={provider:'private-scraper',provider_internal_id:'https://upstream.test/secret',language:'en'};
  const token=seal('m',value);assert.equal(token,seal('m',value));assert.deepEqual(unseal('m',token),value);
  assert.equal(Buffer.from(token.slice(2),'base64url').toString().includes('upstream.test'),false);
  assert.throws(()=>unseal('c',token));assert.throws(()=>unseal('m',token.slice(0,-4)+'xxxx'));
});
test('gap filling merges an exact secondary and automatically falls back when preferred pages fail',async()=>{
  const metadata={provider:'baseline',provider_internal_id:'gap-test',title:'Gap Test Exact',language:'en',genre:[]};
  const baseline={id:'baseline',languages:['en'],browse:async()=>({mangas:[metadata],hasNextPage:false}),manga:async()=>({...metadata,chapters:[{...ref('1',1),provider:'baseline'},{...ref('3',3),provider:'baseline'}]}),pages:async()=>{throw new Error('down');}};
  const scene={id:'scene',languages:['en'],browse:async()=>({mangas:[{...metadata,provider:'scene'}],hasNextPage:false}),manga:async()=>({...metadata,chapters:[{...ref('s1',1,'Scene',{priority:70}),provider:'scene'},{...ref('s2',2,'Scene',{priority:70}),provider:'scene'}]}),pages:async()=>['/api/gateway-image?path=/api/v1/manga/1/chapter/1/page/0']};
  const service=new MangaAggregatorService(async()=>[baseline,scene]);
  const detail=await service.detail(seal('m',{provider:'baseline',provider_internal_id:'gap-test',language:'en'}));
  assert.deepEqual(detail.chapters.map(c=>c.chapterNumber),[1,2,3]);assert.deepEqual(detail.gaps,[]);
  const preferred=detail.chapters[0].releases.find(r=>r.team==='Team A');
  const pages=await service.pages(detail.chapters[0].id,preferred.id);assert.equal(pages.fallbackUsed,true);assert.match(pages.pages[0].src,/^\/api\/proxy\/image\?url=i_/);
  await assert.rejects(service.pages(detail.chapters[1].id,detail.chapters[2].releases[0].id),/Invalid release/);
});
test('image proxy refuses arbitrary URLs and private network destinations',async()=>{
  for(const url of ['http://127.0.0.1/','https://169.254.169.254/','https://evil.test/image.jpg'])assert.equal((await proxyTicket(new Request('https://reader.test/api/proxy/image?url='+encodeURIComponent(url)+'&referer=https://evil.test'))).status,400);
  for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(isPublicAddress(ip),false,ip);
  assert.equal(isPublicAddress('8.8.8.8'),true);
});

test('contiguous baseline feeds still discover later chapters and cache upstream editions',async()=>{
  const metadata={provider:'truncated',provider_internal_id:'truncated-test',title:'Truncated Exact',language:'en',genre:[]};
  let loads=0;
  const primary={id:'truncated',languages:['en'],manga:async()=>({...metadata,chapters:[1,2].map(n=>({...ref('early-'+n,n),provider:'truncated'}))})};
  const secondary={id:'full',languages:['en'],browse:async()=>({mangas:[{...metadata,provider:'full'}],hasNextPage:false}),manga:async()=>{loads++;return {...metadata,provider:'full',chapters:[1,2,3,4].map(n=>({...ref('full-'+n,n),provider:'full'}))};}};
  const service=new MangaAggregatorService(async()=>[primary,secondary]);
  const id=seal('m',metadata);const detail=await service.detail(id);
  assert.deepEqual(detail.chapters.map(c=>c.chapterNumber),[1,2,3,4]);assert.equal(detail.latestChapter,4);
  await service.detail(id);assert.equal(loads,1);
});

test('alias lookup fills gaps while rejecting changed metadata and other-language providers',async()=>{
  const metadata={provider:'alias-primary',provider_internal_id:'alias-test',title:'English Main Name',altTitles:['Romanized Alias'],language:'en',genre:[]};
  const primary={id:'alias-primary',languages:['en'],manga:async()=>({...metadata,chapters:[{...ref('alias1',1),provider:'alias-primary'}]})};
  const alias={id:'alias-secondary',languages:['en'],browse:async o=>({mangas:o.q==='Romanized Alias'?[{...metadata,title:'Romanized Alias',provider:'alias-secondary'}]:[],hasNextPage:false}),manga:async()=>({...metadata,title:'Romanized Alias',chapters:[{...ref('alias2',2),provider:'alias-secondary'}]})};
  const wrong={id:'wrong-secondary',languages:['en'],browse:async()=>({mangas:[metadata],hasNextPage:false}),manga:async()=>({...metadata,title:'Unrelated Sequel',altTitles:[],chapters:[{...ref('wrong3',3),provider:'wrong-secondary'}]})};
  const foreign={id:'foreign',languages:['id'],browse:async()=>{throw new Error('Must never query another reading language');}};
  const detail=await new MangaAggregatorService(async()=>[primary,alias,wrong,foreign]).detail(seal('m',metadata));
  assert.deepEqual(detail.chapters.map(c=>c.chapterNumber),[1,2]);
});

test('old chapter links resolve after another release is merged',()=>{
  const original=mergeReleases([ref('old-release',42)])[0];
  const merged=mergeReleases([ref('new-release',42,'New',{priority:70}),ref('old-release',42)]);
  assert.notEqual(original.id,merged[0].id);assert.equal(findChapter(merged,original.id)?.chapterNumber,42);
  assert.equal(findChapter(merged,'invalid'),undefined);
  assert.equal(mergeReleases([ref('unknown',1,'Unknown')])[0].releases[0].team,'Translation team');
});

test('official webtoon episode feeds do not mix scene chapter numbering',async()=>{
  const metadata={provider:'webtoon',provider_internal_id:'official-test',title:'Official Original Test',language:'en'};
  const official={id:'webtoon',languages:['en'],manga:async()=>({...metadata,chapters:[{...ref('episode1',1),provider:'webtoon'}]})};
  const other={id:'not-official',languages:['en'],browse:async()=>{throw new Error('Do not cross-match official episode feeds');}};
  const detail=await new MangaAggregatorService(async()=>[official,other]).detail(seal('m',metadata));
  assert.equal(detail.chapters.length,1);assert.equal(detail.incomplete,false);
});

test('detail reuses a catalog search match instead of losing it to an empty repeat search',async()=>{
  const metadata={provider:'repeat-primary',provider_internal_id:'repeat-search-test',title:'Repeat-Search Title',language:'en',genre:[]};
  const primary={id:'repeat-primary',languages:['en'],browse:async()=>({mangas:[metadata],hasNextPage:false}),manga:async()=>({...metadata,chapters:[{...ref('repeat1',1),provider:'repeat-primary'}]})};
  let searches=0;
  const other={id:'repeat-secondary',languages:['en'],browse:async o=>({mangas:++searches===1?[{...metadata,provider:'repeat-secondary'}]:[],hasNextPage:false}),manga:async()=>({...metadata,chapters:[{...ref('repeat2',2),provider:'repeat-secondary'}]})};
  const service=new MangaAggregatorService(async()=>[primary,other]);
  const catalog=await service.catalog({q:'Repeat Search Title',language:'en',category:'popular',page:1});
  const detail=await service.detail(catalog.comics[0].id);
  assert.deepEqual(detail.chapters.map(c=>c.chapterNumber),[1,2]);
});
