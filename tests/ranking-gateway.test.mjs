import test from 'node:test';
import assert from 'node:assert/strict';
import {rankComics,animeBoost} from '../lib/ranking.mjs';
import {Cache,cache} from '../lib/cache.mjs';
import {handleGateway,handleGatewayImage,isSuwayomiImagePath} from '../lib/gateway.mjs';
import {handleTrending,handleTrendingSync} from '../lib/trending.mjs';
import {MangaDexClient} from '../public/mangadex.js';
import {canReadStrip} from '../public/webtoon-strip.js';
const now=Date.parse('2026-10-12T00:00:00Z');
test('Measured follower velocity can outrank all-time popularity; losses never become growth',()=>{
 const rows=rankComics([{id:'old',follows:100000,updatedAt:'2020-01-01'},{id:'rising',follows:1000,updatedAt:'2026-10-12'},{id:'losing',follows:100,updatedAt:'2020-01-01'}],{generatedAt:'2026-10-11',observations:[{id:'old',follows:99999},{id:'rising',follows:500},{id:'losing',follows:150}]},now);
 assert.equal(rows[0].id,'rising');assert.equal(rows.find(m=>m.id==='losing').velocity,0);assert.equal(rows[0].scoreDetails.baseline,false);
});
test('Anime boosts are bounded, and first/too recent/expired observations never invent velocity',()=>{
 assert.equal(animeBoost(['FINISHED']),0);assert.equal(animeBoost(['NOT_YET_RELEASED']),10);assert.equal(animeBoost(['RELEASING','NOT_YET_RELEASED']),20);
 for(const generatedAt of [null,'2026-10-11T23:00:00Z','2026-09-01']){const [row]=rankComics([{id:'a',follows:100,updatedAt:'2026-10-12',animeStatuses:['RELEASING']}],generatedAt?{generatedAt,observations:[{id:'a',follows:0}]}:null,now);assert.equal(row.velocity,null);assert.equal(row.scoreDetails.baseline,true);assert.ok(row.score<=100);}
});
test('Cache coalesces concurrent provider misses; a failed load remains retryable',async()=>{
 const cache=new Cache({});let calls=0;const load=async()=>{calls++;await Promise.resolve();return {ok:true};};const results=await Promise.all([cache.remember('x',60,load),cache.remember('x',60,load)]);assert.equal(calls,1);assert.deepEqual(results[0],results[1]);await assert.rejects(cache.remember('fail',60,()=>{throw Error('offline')}));assert.equal(await cache.remember('fail',60,async()=>1),1);
});
test('Redis adapter sends authenticated JSON commands with expiry',async()=>{
 const calls=[];const cache=new Cache({UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'private'},async(url,options)=>{calls.push(options);return Response.json({result:'OK'});});await cache.set('test',{hello:1},120);assert.equal(calls[0].headers.Authorization,'Bearer private');assert.deepEqual(JSON.parse(calls[0].body),['SET','inkrush:test','{"hello":1}','EX',120]);
});
test('Indonesian editions query Indonesian chapters and retain separate bookmark IDs',async()=>{
 const client=new MangaDexClient(),calls=[];const uuid='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';client.request=async(path,params)=>{calls.push({path,params});return path.endsWith('/feed')?{data:[],total:0,limit:500}:{data:{id:uuid,attributes:{title:{en:'Title'},tags:[]},relationships:[]}};};const story=await client.manga('md:id:'+uuid);assert.equal(story.id,'md:id:'+uuid);assert.equal(story.translatedLanguage,'id');assert.equal(calls[1].params['translatedLanguage[]'],'id');assert.equal(calls[0].path,'/manga/'+uuid);
});
test('Gateway rejects arbitrary sources and paths; cron cannot be called anonymously',async()=>{
 for(const suffix of ['?action=delete','?action=manga&id=https://evil.test','?action=catalog&source=evil','?action=catalog&page=-1'])assert.equal((await handleGateway(new Request('https://reader.test/api/gateway'+suffix))).status,400);
 assert.equal((await handleGatewayImage(new Request('https://reader.test/api/gateway-image?path=//evil.test'))).status,400);
 assert.equal((await handleTrendingSync(new Request('https://reader.test/api/trending-sync'))).status,401);
 assert.equal(isSuwayomiImagePath('/api/v1/manga/23/chapter/0/page/5'),true);assert.equal(isSuwayomiImagePath('/api/v1/manga/23/thumbnail'),true);assert.equal(isSuwayomiImagePath('/api/v1/settings'),false);assert.equal(isSuwayomiImagePath('//evil.test/api/v1/manga/23/thumbnail'),false);
});
test('Trending reads bundled real snapshots without querying upstream services',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('No upstream calls allowed')};try{for(const language of ['en','id']){const response=await handleTrending(new Request('https://reader.test/api/trending?language='+language));assert.equal(response.status,200);const data=await response.json();assert.equal(data.mangas.length,18);assert.equal(data.ranking.language,language);assert.ok(data.mangas.every(m=>m.translatedLanguage===language));}}finally{globalThis.fetch=original;}
});
test('Strip mode is offered only for webtoons; manga and manhwa keep page reading',()=>{
 assert.equal(canReadStrip({id:'wt:/en/title'}),true);assert.equal(canReadStrip({format:'Webtoon'}),true);for(const story of [{id:'uuid',originalLanguage:'ko'},{id:'wc:123',format:'Manhwa'},{id:'demo',demo:true,format:'Webtoon'}])assert.equal(canReadStrip(story),false);
});
test('Daily worker publishes complete EN/ID rankings and retains last-good snapshots on provider failure',async()=>{
 const originals={fetch:globalThis.fetch,secret:process.env.CRON_SECRET,url:cache.url,token:cache.token,get:cache.get,set:cache.set,command:cache.command};
 const writes=[],commands=[];const uuid='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 try{process.env.CRON_SECRET='test-worker-secret';cache.url='https://redis.test';cache.token='test';cache.command=async args=>{commands.push(args);return args[0]==='SET'?'OK':1;};cache.get=async key=>key.startsWith('ranking:')?{generatedAt:new Date(Date.now()-86400000).toISOString(),observations:[{id:key.endsWith('id')?'md:id:'+uuid:uuid,follows:5}]}:null;cache.set=async(key,value)=>{writes.push({key,value});};
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/statistics/'))return Response.json({statistics:{[uuid]:{follows:15}}});if(String(url).includes('graphql.anilist.co')){assert.deepEqual(JSON.parse(options.body).variables.ids,[123]);return Response.json({data:{Page:{media:[{id:123,relations:{edges:[{relationType:'ADAPTATION',node:{type:'ANIME',status:'RELEASING'}}]}}]}}});}return Response.json({data:[{id:uuid,attributes:{title:{en:'Verified title'},description:{},tags:[],links:{al:'123'},updatedAt:new Date().toISOString()},relationships:[]}]});};
 const request=new Request('https://reader.test/api/trending-sync',{headers:{Authorization:'Bearer test-worker-secret'}});const response=await handleTrendingSync(request);assert.equal(response.status,200);assert.equal(writes.filter(w=>w.key.startsWith('ranking:')).length,2);for(const write of writes.filter(w=>w.key.startsWith('ranking:'))){assert.equal(write.value.mangas[0].scoreDetails.baseline,false);assert.equal(write.value.mangas[0].scoreDetails.animeBoost,20);assert.ok(write.value.mangas[0].velocity>9.9);}
 writes.length=0;globalThis.fetch=async()=>{throw Error('Source offline')};assert.equal((await handleTrendingSync(request)).status,502);assert.equal(writes.length,0);assert.equal(commands.filter(c=>c[0]==='EVAL').length,2);
 }finally{globalThis.fetch=originals.fetch;if(originals.secret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=originals.secret;Object.assign(cache,{url:originals.url,token:originals.token,get:originals.get,set:originals.set,command:originals.command});}
});
