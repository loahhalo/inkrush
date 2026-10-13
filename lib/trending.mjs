import {readFile} from 'node:fs/promises';
import {cache} from './cache.mjs';
import {rankComics} from './ranking.mjs';
import {normalizeManga,CATALOG_RATINGS} from '../public/mangadex.js';
const DAY=86400000;
export async function getJSON(url,options={}){const response=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Provider unavailable (${response.status})`);const data=await response.json();if(data.errors?.length)throw new Error('Provider returned an error');return data;}
export async function buildRanking(language,previous=null,{ratings=CATALOG_RATINGS}={}){
  if(!['en','id'].includes(language))throw new Error('Unsupported language');
  const candidates=new Map();
  // Two bounded pools avoid simply reordering the all-time most followed titles.
  const pools=await Promise.all(['followedCount','latestUploadedChapter'].map(async sort=>{const params=new URLSearchParams({limit:'30','availableTranslatedLanguage[]':language,hasAvailableChapters:'true',['order['+sort+']']:'desc'});for(const rating of ratings)params.append('contentRating[]',rating);params.append('includes[]','cover_art');params.append('includes[]','author');return getJSON('https://api.mangadex.org/manga?'+params);}));
  for(const data of pools)for(const item of data.data)candidates.set(item.id,item);
  const statURL=new URL('https://api.mangadex.org/statistics/manga');for(const id of candidates.keys())statURL.searchParams.append('manga[]',id);const statistics=await getJSON(statURL);
  const observations=[...candidates.values()].map(item=>({...normalizeManga(item),id:language==='id'?'md:id:'+item.id:item.id,translatedLanguage:language,updatedAt:item.attributes.updatedAt,follows:statistics.statistics?.[item.id]?.follows||0,anilistId:/^\d+$/.test(item.attributes.links?.al||'')?Number(item.attributes.links.al):null}));
  const linked=observations.filter(m=>m.anilistId);let metadataFailures=0;
  // Only exact MangaDex -> AniList IDs; ambiguous fuzzy title matches never earn a boost.
  for(let start=0;start<linked.length;start+=25){const batch=linked.slice(start,start+25);try{const ids=[...new Set(batch.map(m=>m.anilistId))];const data=await cache.remember('anime:'+ids.join(','),6*3600,()=>getJSON('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query($ids:[Int]){Page(perPage:25){media(id_in:$ids,type:MANGA){id relations{edges{relationType node{type status}}}}}}',variables:{ids}})}));const matched=new Map(data.data.Page.media.map(m=>[m.id,m]));for(const m of batch){const media=matched.get(m.anilistId);m.animeChecked=!!media;m.animeStatuses=(media?.relations?.edges||[]).filter(e=>e.relationType==='ADAPTATION'&&e.node.type==='ANIME').map(e=>e.node.status);}}catch{metadataFailures+=batch.length;}}
  const generatedAt=new Date().toISOString();return {version:1,language,generatedAt,metadataFailures,observations,mangas:rankComics(observations,previous,Date.parse(generatedAt))};
}
export async function baseline(language){try{return JSON.parse(await readFile(new URL(`./data/trending-${language}.json`,import.meta.url),'utf8'));}catch{return null;}}
export async function rankingSnapshot(language){let data;try{data=await cache.get('ranking:'+language);}catch{}return data||await baseline(language);}
export async function handleTrending(request){const url=new URL(request.url),language=url.searchParams.get('language')||'en',page=Number(url.searchParams.get('page')||1);if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});if(!['en','id'].includes(language)||!Number.isInteger(page)||page<1||page>100)return Response.json({error:'Invalid language or page'},{status:400});const data=await rankingSnapshot(language);if(!data)return Response.json({error:'Ranking has not been initialized.'},{status:503,headers:{'Retry-After':'3600'}});const stale=Date.now()-Date.parse(data.generatedAt)>2*DAY;return Response.json({mangas:data.mangas.slice((page-1)*18,page*18),hasNextPage:page*18<data.mangas.length,ranking:{generatedAt:data.generatedAt,language,stale,baseline:data.mangas.every(m=>m.scoreDetails.baseline)}},{headers:{'Cache-Control':'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400'}});}
export async function handleTrendingSync(request){
  if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
  if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
  if(!cache.durable)return Response.json({error:'Configure Upstash Redis before enabling daily sync.'},{status:503});
  const lock=crypto.randomUUID();if(await cache.command(['SET','inkrush:ranking-lock',lock,'NX','EX',300])!=='OK')return Response.json({status:'already running'},{status:202});
  const results=[];try{for(const language of ['en','id']){try{const previous=await rankingSnapshot(language);if(previous&&Date.now()-Date.parse(previous.generatedAt)<20*3600000){results.push({language,status:'fresh'});continue;}const next=await buildRanking(language,previous);await cache.set('ranking:'+language,next,30*86400);results.push({language,status:'updated',count:next.mangas.length});}catch{results.push({language,status:'failed; previous snapshot retained'});}}return Response.json({results},{status:results.some(r=>r.status.startsWith('failed'))?502:200});}finally{await cache.command(['EVAL',"if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,'inkrush:ranking-lock',lock]);}
}
