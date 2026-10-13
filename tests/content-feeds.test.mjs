import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPreferences,normalizePreferences,parsePreferences,matchesPreferences,classifyTags,comicFormat} from '../platform/shared/content.ts';
import {LiveFeedCache} from '../platform/server/live-feed.ts';
import {catalogRank,mergeMetadata} from '../platform/server/catalog-metadata.ts';
import {normalizeManga} from '../public/mangadex.js';
import {MangaDexProvider,SceneProvider} from '../platform/server/providers.ts';

test('source taxonomy keeps rating, demographic, genre, theme and content groups distinct',()=>{
  const tag=(group,name)=>({attributes:{group,name:{en:name}}});
  const raw={id:'taxonomy-test',attributes:{title:{en:'Test'},contentRating:'suggestive',publicationDemographic:'shounen',originalLanguage:'ja',tags:[tag('genre','Adventure'),tag('theme','Pirates'),tag('content','Gore')]},relationships:[]};
  const m=normalizeManga(raw);assert.equal(m.contentRating,'suggestive');assert.equal(m.demographic,'shounen');assert.deepEqual(m.genre,['Adventure']);assert.deepEqual(m.themes,['Pirates']);assert.deepEqual(m.contentTags,['Gore']);
  assert.deepEqual(classifyTags(['Action','Shonen','Gore','Reincarnation','Manhwa']),{genre:['Action','Shonen'],themes:['Reincarnation'],contentTags:['Gore'],demographic:'shounen'});
});
test('preferences filter maturity, types and demographics independently without calling unknown titles safe',()=>{
  const prefs=defaultPreferences(),comic={format:'Manhwa',contentRating:'suggestive',demographic:'shounen',genre:['Action'],themes:['Reincarnation']};
  assert.equal(matchesPreferences(comic,prefs),true);assert.equal(matchesPreferences({...comic,contentRating:'pornographic'},prefs),false);
  assert.equal(matchesPreferences({...comic,contentRating:null},prefs),true);assert.equal(matchesPreferences({...comic,contentRating:null},{...prefs,ratings:['safe','suggestive']}),false);
  assert.equal(matchesPreferences(comic,{...prefs,types:['Manga']}),false);assert.equal(matchesPreferences(comic,{...prefs,demographics:['seinen']}),false);
  assert.equal(matchesPreferences(comic,{...prefs,ratings:[]}),false);
});
test('blocked tags match across source synonyms and all taxonomy groups',()=>{
  const p=defaultPreferences(),comic={format:'Manga',contentRating:'safe',genre:['Yaoi'],themes:['School Life'],contentTags:['Gore']};
  for(const changes of [{blockedGenres:['Boys’ Love']},{blockedGenres:['School']},{blockedGenres:['Gore']},{blockedThemes:['School Life']}])assert.equal(matchesPreferences(comic,{...p,...changes}),false);
  assert.equal(matchesPreferences(comic,{...p,blockedThemes:['Zombie']}),true);
});
test('stored preferences and API inputs are normalized and bounded',()=>{
  assert.deepEqual(normalizePreferences(null),defaultPreferences());assert.deepEqual(normalizePreferences({ratings:['safe','safe','invalid'],types:[]}).ratings,['safe']);assert.deepEqual(normalizePreferences({types:[]}).types,[]);
  assert.throws(()=>parsePreferences('not-json'));assert.throws(()=>parsePreferences('[]'));assert.throws(()=>parsePreferences(JSON.stringify({blockedGenres:[4]})));assert.throws(()=>parsePreferences('x'.repeat(6001)));
});
test('live feeds coalesce cold loads, refresh in the background and keep the actual fetched timestamp',async()=>{
  let now=1000,calls=0,release;const cache=new LiveFeedCache({ttlMs:60,now:()=>now});
  const loader=async()=>{calls++;return new Promise(resolve=>release=resolve);};const a=cache.read('feed',loader),b=cache.read('feed',loader);await Promise.resolve();assert.equal(calls,1);release('first');const [one,two]=await Promise.all([a,b]);assert.equal(one.value,two.value);
  now=1061;const stale=await cache.read('feed',loader);assert.equal(stale.value,'first');assert.equal(stale.refreshing,true);assert.equal(stale.updatedAt,new Date(1000).toISOString());await Promise.resolve();assert.equal(calls,2);release('second');await new Promise(resolve=>setImmediate(resolve));const fresh=await cache.read('feed',loader);assert.equal(fresh.value,'second');assert.equal(fresh.updatedAt,new Date(1061).toISOString());assert.equal(calls,2);
});
test('failed live refresh retains a working feed and throttles retries',async()=>{
  let now=0,calls=0;const cache=new LiveFeedCache({ttlMs:60,now:()=>now});await cache.read('a',async()=>['good']);now=61;
  const fail=async()=>{calls++;throw Error('source unavailable');};await cache.read('a',fail);await new Promise(resolve=>setImmediate(resolve));const kept=await cache.read('a',fail);assert.deepEqual(kept.value,['good']);assert.equal(kept.stale,true);assert.equal(calls,1);assert.equal(kept.updatedAt,new Date(0).toISOString());
});
test('latest, new and popular have different ordering and merged metadata keeps stronger ratings',()=>{
  const now=Date.parse('2026-10-13T00:00:00Z'),old={provider:'a',provider_internal_id:'old',language:'en',title:'Old',genre:['Action'],releaseDate:'2026-10-10',createdAt:'2020-01-01'},recent={...old,title:'Recently updated',provider_internal_id:'update',releaseDate:'2026-10-12'},added={...old,title:'Recently added',provider_internal_id:'new',createdAt:'2026-10-12'};
  const items=()=>[{manga:old,rank:.1},{manga:recent,rank:.04},{manga:added,rank:.03}];assert.equal(catalogRank(items(),'popular',now)[0].title,'Old');assert.equal(catalogRank(items(),'latest',now)[0].title,'Recently updated');assert.equal(catalogRank(items(),'new',now)[0].title,'Recently added');
  const enriched=mergeMetadata({...old,contentRating:'safe'},{...old,contentRating:'suggestive',demographic:'shounen',themes:['Pirates']});assert.equal(enriched.contentRating,'suggestive');assert.equal(enriched.demographic,'shounen');assert.deepEqual(enriched.themes,['Pirates']);assert.equal(enriched.provider_internal_id,'old');
});
test('metadata-only lookup can find licensed manga without requiring readable chapters',async()=>{
  const original=globalThis.fetch,requests=[];globalThis.fetch=async input=>{const url=new URL(input);requests.push(url);return Response.json({data:[],limit:30,offset:0,total:0});};
  try{const p=new MangaDexProvider();await p.browse({q:'Licensed metadata test',language:'en',category:'popular',page:1,metadataOnly:true});assert.equal(requests[0].searchParams.has('hasAvailableChapters'),false);assert.equal(requests[0].searchParams.has('availableTranslatedLanguage[]'),false);assert.ok(requests[0].searchParams.getAll('contentRating[]').includes('suggestive'));}
  finally{globalThis.fetch=original;}
});
test('sources without a real new-title feed never relabel latest chapter updates as new manga',async()=>{
  const provider=new SceneProvider({id:'not-connected',lang:'en',name:'Test'});assert.deepEqual(await provider.browse({q:'',language:'en',category:'new',page:1}),{mangas:[],hasNextPage:false});
});
test('format uses known source metadata instead of guessing every unclassified comic is Japanese manga',()=>{
  assert.equal(comicFormat(undefined,'ko'),'Manhwa');assert.equal(comicFormat(undefined,'ja'),'Manga');assert.equal(comicFormat(undefined,'zh-hk'),'Manhua');assert.equal(comicFormat(undefined,undefined,['Manhwa','Action']),'Manhwa');assert.equal(comicFormat(), 'Other');assert.equal(comicFormat('Webtoon'),'Webtoon');
});
