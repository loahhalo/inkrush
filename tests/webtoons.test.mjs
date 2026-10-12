import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseWebtoonCatalog,parseWebtoonDetails,normalizeWebtoonEpisodes,parseWebtoonPages,webtoonPath,handleWebtoons,proxyWebtoonImage} from '../lib/webtoons.mjs';
import {PublicComicClient} from '../public/sources.js';
import {MangaDexClient} from '../public/mangadex.js';
import {isSoloLeveling} from '../public/publisher-titles.js';
const path='/en/fantasy/academy/list?title_no=6465';
const cover='https://webtoon-phinf.pstatic.net/20240614_191/1718321362211HB8Ik_PNG/cover.png?type=q90';
test('WEBTOON catalog parses real card markup and normalizes source IDs',()=>{
 const card=`<a class="link" href="https://www.webtoons.com${path}&amp;tracking=1"><img src="${cover}"><div class="genre">Fantasy</div><strong class="title">The Extra&rsquo;s Academy</strong><span class="badge_new2">NEW</span></a>`;
 const titles=parseWebtoonCatalog(card+card+'<a href="https://evil.test/en/fantasy/academy/list?title_no=1"><strong class="title">Spoof</strong></a>');assert.equal(titles.length,1);assert.equal(titles[0].id,'wt:'+path);assert.equal(titles[0].title,'The Extra’s Academy');assert.equal(titles[0].format,'Webtoon');assert.equal(titles[0].newRelease,true);assert.match(titles[0].poster,/^\/api\/webtoon-image/);
});
test('WEBTOON details keep English title, synopsis, creator, and publication state',()=>{
 const detail=parseWebtoonDetails(`<meta property="og:image" content="${cover}"><h1 class="subj">The Extra’s<br>Academy</h1><div class="author_area">Creator &amp; Artist</div><p class="summary">An English story.</p><p class="day_info">EVERY MONDAY</p>`,path);assert.equal(detail.title,'The Extra’s Academy');assert.equal(detail.author,'Creator & Artist');assert.equal(detail.status,'ongoing');assert.equal(detail.description,'An English story.');
});
test('WEBTOON episodes retain sequence and stable IDs across prologues and bonuses',()=>{
 const episode=(n,title,extra={})=>({episodeNo:n,episodeTitle:title,viewerLink:`/en/fantasy/academy/episode-${n}/viewer?title_no=6465&episode_no=${n}`,exposureDateMillis:1700000000000,...extra});
 const episodes=normalizeWebtoonEpisodes([episode(3,'Bonus'),episode(1,'Episode 0 - Prologue'),episode(2,'Episode 1'),episode(2,'Episode 1'),episode(4,'Future',{exposureDateMillis:Date.now()+999999}),episode(5,'Bad',{viewerLink:'https://evil.test/'})]);assert.deepEqual(episodes.map(c=>c.sequence),[1,2,3]);assert.equal(episodes[0].chapterNumber,'0');assert.equal(episodes[2].name,'Bonus');
});
test('Only episode images inside the reader are accepted; app-gated pages stay empty',()=>{
 const html=`<img data-url="${cover}" class="thumbnail"><div id="_imageList"><img data-url="${cover}"><img data-url="https://evil.test/image.png"></div>`;assert.equal(parseWebtoonPages(html).length,1);assert.deepEqual(parseWebtoonPages('<div class="daily-pass">Read in app</div>'),[]);
});
test('New source refuses unrelated URLs, credentials, methods, and image hosts',async()=>{
 for(const value of ['https://evil.test'+path,'https://user:pass@www.webtoons.com'+path,'/en/login?title_no=1',path.replace('6465','bad')])assert.throws(()=>webtoonPath(value));
 assert.equal((await handleWebtoons(new Request('https://reader.test/api/webtoons?action=admin'))).status,400);
 assert.equal((await handleWebtoons(new Request('https://reader.test/api/webtoons',{method:'POST'}))).status,405);
 for(const value of ['https://webtoon-phinf.pstatic.net.evil.test/a.png','http://webtoon-phinf.pstatic.net/a.png','https://localhost/a.png'])assert.equal((await proxyWebtoonImage(new Request('https://reader.test/api/webtoon-image?url='+encodeURIComponent(value)))).status,400);
});
test('Source routing preserves MangaDex bookmarks and dispatches WEBTOON chapters correctly',async()=>{
 const client=new PublicComicClient();assert.equal(client.base,'https://api.mangadex.org');const calls=[];client.dex.manga=async id=>calls.push('dex:'+id);client.webtoon.manga=async id=>calls.push('wt:'+id);client.webtoon.pages=async id=>calls.push('page:'+id);client.central.pages=async id=>calls.push('central:'+id);await client.manga('uuid');await client.manga('wt:'+path);await client.pages('wt:episode');await client.pages('wc:chapter');assert.deepEqual(calls,['dex:uuid','wt:wt:'+path,'page:wt:episode','central:wc:chapter']);client.dex.gateway=async()=>({sources:[]});assert.equal((await client.sources()).length,4);
});
test('MangaDex titles without readable pages keep metadata for the alternative-source overview',async()=>{
 const client=new MangaDexClient();client.request=async url=>url.endsWith('/feed')?{data:[],limit:500,total:0}:{data:{id:'uuid',attributes:{title:{en:'A Manhwa'},description:{en:'Story'},tags:[]},relationships:[]}};const story=await client.manga('uuid');assert.equal(story.title,'A Manhwa');assert.deepEqual(story.chapters,[]);
});
test('Soundtrack code is archived and excluded from the active public app',async()=>{
 const app=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/ChapterSoundtrack|soundtrack\.update|music\.js/);for(const file of ['music.js','music.css','mood.js','chapter-analysis.js']){await assert.rejects(fs.access(new URL('../public/'+file,import.meta.url)));assert.ok((await fs.stat(new URL('../archive/soundtrack/public/'+file,import.meta.url))).size>0);}
});
test('Solo Leveling gets its verified English publisher, without confusing the sequel',async()=>{
 assert.equal(isSoloLeveling('Solo Leveling'),true);assert.equal(isSoloLeveling('SoloLeveling'),true);assert.equal(isSoloLeveling('Solo Leveling: Ragnarok'),false);
 const client=new PublicComicClient();const title=await client.manga('publisher:solo-leveling');assert.equal(title.title,'Solo Leveling');assert.equal(title.providerOnly,true);assert.equal(title.sourceUrl,'https://www.tappytoon.com/en/book/187');
});

