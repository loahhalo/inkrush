import {MangaDexClient} from '../public/mangadex.js';
import {createSuwayomiClient} from './suwayomi-config.mjs';
import {proxyMangaDex} from './mangadex-proxy.mjs';
import {handleWebtoons} from './webtoons.mjs';
import {cache} from './cache.mjs';
import {handleTrending} from './trending.mjs';
const UUID=/^(?:md:id:)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
class ServerDex extends MangaDexClient {
  async request(path,params={}){const url=new URL('https://gateway.internal'+path);for(const [key,value]of Object.entries(params))for(const v of Array.isArray(value)?value:[value])url.searchParams.append(key,v);const response=await proxyMangaDex(new Request(url),path.split('/').filter(Boolean));const data=await response.json();if(!response.ok){const error=new Error(data.error);error.status=response.status;throw error;}return data;}
}
const dex=new ServerDex();
const suwayomi=()=>createSuwayomiClient();
async function extensionRequest(query,variables){const client=suwayomi();if(!client)throw new Error('Indonesian extension backend has not been configured');return client.request(query,variables);}
export const isSuwayomiImagePath=path=>/^\/api\/v1\/(?:manga\/\d+\/(?:thumbnail|chapter\/\d+\/page\/\d+)|chapter\/\d+\/page\/\d+)$/.test(path||'');
const extensionImage=value=>{const base=process.env.SUWAYOMI_URL;if(!value||!base)return '';const url=new URL(value,base);if(url.origin!==new URL(base).origin||!isSuwayomiImagePath(url.pathname))return '';return '/api/gateway-image?path='+encodeURIComponent(url.pathname);};
async function extensionSources(){if(!process.env.SUWAYOMI_URL)return [];const data=await extensionRequest('query { sources(first:500){nodes{id name lang}} }');return data.sources.nodes.filter(s=>s.id!=='0'&&['id','en'].includes(s.lang)).map(s=>({...s,id:'sw:s:'+s.id,name:s.name+' · Suwayomi'}));}
async function extensionAction(action,params){
  const raw=params.id?.split(':').pop();
  if(action==='catalog'){if(!/^sw:s:\d+$/.test(params.source))throw new Error('Invalid extension source');const data=await extensionRequest('mutation($input:FetchSourceMangaInput!){fetchSourceManga(input:$input){hasNextPage mangas{id title thumbnailUrl}}}',{input:{source:params.source.slice(5),type:params.q?'SEARCH':'POPULAR',query:params.q,page:params.page}});return {...data.fetchSourceManga,mangas:data.fetchSourceManga.mangas.map(m=>({...m,id:'sw:m:'+m.id,poster:extensionImage(m.thumbnailUrl)}))};}
  if(!/^sw:[mc]:\d+$/.test(params.id||''))throw new Error('Invalid extension identifier');
  if(action==='manga'){const data=await extensionRequest('mutation($input:FetchMangaAndChaptersInput!){fetchMangaAndChapters(input:$input){manga{id title description author genre thumbnailUrl source{lang name}} chapters{id name chapterNumber sourceOrder}}}',{input:{id:Number(raw),fetchManga:true,fetchChapters:true}});const {manga,chapters}=data.fetchMangaAndChapters;return {...manga,id:'sw:m:'+manga.id,translatedLanguage:manga.source?.lang,sourceLabel:manga.source?.name||'Suwayomi',poster:extensionImage(manga.thumbnailUrl),chapters:[...chapters].sort((a,b)=>a.chapterNumber-b.chapterNumber||b.sourceOrder-a.sourceOrder).map(c=>({...c,id:'sw:c:'+c.id}))};}
  const data=await extensionRequest('mutation($input:FetchChapterPagesInput!){fetchChapterPages(input:$input){pages}}',{input:{chapterId:Number(raw)}});const pages=data.fetchChapterPages.pages.map(extensionImage).filter(Boolean);if(!pages.length)throw new Error('The extension returned no supported page images. Check its source in Suwayomi.');return {pages};
}
export async function handleGateway(request){
  if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
  const url=new URL(request.url),action=url.searchParams.get('action')||'sources',params=Object.fromEntries(url.searchParams);params.page=Number(params.page||1);
  if(!['sources','catalog','manga','pages'].includes(action)||!Number.isInteger(params.page)||params.page<1||params.page>100||String(params.q||'').length>150)return Response.json({error:'Invalid gateway request'},{status:400});
  if(['manga','pages'].includes(action)&&!UUID.test(params.id||'')&&!/^wt:\/en\//.test(params.id||'')&&!/^sw:[mc]:\d+$/.test(params.id||''))return Response.json({error:'Invalid comic identifier'},{status:400});
  try{
    if(action==='sources'){let extra=[];try{extra=await cache.remember('extension-sources',process.env.INKRUSH_LOCAL==='1'?5:300,extensionSources);}catch{}return Response.json({sources:[{id:'mangadex-en',name:'MangaDex',lang:'en'},{id:'mangadex-id',name:'MangaDex · Bahasa Indonesia',lang:'id'},{id:'webtoons-en',name:'WEBTOON',lang:'en'},...extra]});}
    if(params.source?.startsWith('sw:')||params.id?.startsWith('sw:')){if(!process.env.SUWAYOMI_URL)return Response.json({error:'Suwayomi backend is not configured'},{status:503});const data=await cache.remember('sw:'+JSON.stringify(params),action==='pages'?60:300,()=>extensionAction(action,params));return Response.json(data,{headers:{'Cache-Control':'public, s-maxage=60'}});}
    if(params.source==='webtoons-en'||params.id?.startsWith('wt:')){const upstream=new URL('/api/webtoons',url);for(const [k,v]of Object.entries(params))upstream.searchParams.set(k,v);const result=await cache.remember('webtoon:'+JSON.stringify(params),action==='pages'?60:120,async()=>{const response=await handleWebtoons(new Request(upstream));const result={status:response.status,body:await response.json()};if(!response.ok)throw {gatewayResponse:result};return result;});return Response.json(result.body,{status:result.status,headers:{'Cache-Control':'public, max-age=60, s-maxage=120'}});}
    if(action==='catalog'&&!['mangadex-en','mangadex-id'].includes(params.source))return Response.json({error:'Unknown source'},{status:400});
    if(action==='catalog'&&params.category==='trending'&&!params.q&&!params.genre&&!params.language&&!params.status){const upstream=new URL('/api/trending',url);upstream.searchParams.set('language',params.source==='mangadex-id'?'id':'en');upstream.searchParams.set('page',params.page);return handleTrending(new Request(upstream));}
    const data=await cache.remember('gateway:'+JSON.stringify(params),action==='pages'?60:120,async()=>action==='catalog'?dex.browse(params.source,params.q,params.page,params):action==='manga'?dex.manga(params.id):{pages:await dex.pages(params.id,true)});
    return Response.json(data,{headers:{'Cache-Control':'public, max-age=30, s-maxage=120, stale-while-revalidate=300'}});
  }catch(error){if(error.gatewayResponse)return Response.json(error.gatewayResponse.body,{status:error.gatewayResponse.status,headers:{'Cache-Control':'no-store'}});return Response.json({error:error.message||'Comic provider is temporarily unavailable.'},{status:error.status===429?429:502,headers:{'Cache-Control':'no-store',...(error.status===429?{'Retry-After':'60'}:{})}});}
}
export async function handleGatewayImage(request){const path=new URL(request.url).searchParams.get('path');if(!isSuwayomiImagePath(path))return new Response('Invalid image path',{status:400});try{const client=suwayomi();if(!client)return new Response('Backend not configured',{status:503});const response=await fetch(new URL(path,client.base),{redirect:'manual',headers:client.authorization?{Authorization:client.authorization}:{},signal:AbortSignal.timeout(20000)});if(!response.ok||!response.headers.get('Content-Type')?.startsWith('image/'))return new Response('Source image unavailable',{status:502});return new Response(response.body,{headers:{'Content-Type':response.headers.get('Content-Type'),'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Image unavailable',{status:502});}}
