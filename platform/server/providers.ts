import {handleGateway} from '../../lib/gateway.mjs';
import {createSuwayomiClient} from '../../lib/suwayomi-config.mjs';
import {Cache} from '../../lib/cache.mjs';
import {normalizeManga} from '../../public/mangadex.js';
import type {BrowseOptions,InternalManga,InternalRelease,Language} from './types.ts';

export abstract class MangaProvider {
  abstract readonly id:string;
  abstract readonly languages:Language[];
  readonly priority:number=10;
  abstract browse(options:BrowseOptions):Promise<{mangas:InternalManga[];hasNextPage:boolean}>;
  abstract manga(id:string,language:Language):Promise<InternalManga & {chapters:InternalRelease[]}>;
  abstract pages(id:string):Promise<string[]>;
}
const providerCache=new Cache();
async function legacy(action:string,params:Record<string,unknown>){const url=new URL('https://internal/api/gateway');url.searchParams.set('action',action);for(const [k,v]of Object.entries(params))if(v!==undefined)url.searchParams.set(k,String(v));const response=await handleGateway(new Request(url));if(!response.ok)throw new Error('Edition temporarily unavailable');return response.json();}
async function dex(path:string,params:Record<string,unknown>={}){const url=new URL('https://api.mangadex.org'+path);for(const [k,v]of Object.entries(params))for(const item of Array.isArray(v)?v:[v])url.searchParams.append(k,String(item));const response=await fetch(url,{headers:{'User-Agent':'INKRUSH/2.0','Accept':'application/json'},signal:AbortSignal.timeout(16000)});if(!response.ok)throw new Error('Edition temporarily unavailable');return response.json();}
function wrap(provider:string,m:Record<string,any>,language:Language):InternalManga{return {provider,provider_internal_id:provider==='dex'?String(m.id).replace(/^md:id:/,''):m.id,language,title:m.title,altTitles:m.altTitles,author:m.author,description:m.description,genre:Array.isArray(m.genre)?m.genre:[],poster:m.poster,format:m.format||(m.originalLanguage==='ko'?'Manhwa':m.originalLanguage?.startsWith('zh')?'Manhua':'Manga'),originalLanguage:m.originalLanguage,status:m.status,latestChapter:m.latestChapter,releaseDate:m.releaseDate};}

export class MangaDexProvider extends MangaProvider {
  readonly id='dex'; readonly languages:Language[]=['en','id']; readonly priority=40;
  async browse(options:BrowseOptions){const data=await legacy('catalog',{source:'mangadex-'+options.language,...options,language:options.type});return {mangas:data.mangas.map((m:Record<string,any>)=>wrap(this.id,m,options.language)),hasNextPage:data.hasNextPage};}
  async manga(id:string,language:Language){const raw=id.replace(/^md:id:/,''),metadata=await dex('/manga/'+raw,{'includes[]':['cover_art','author']});const all:Record<string,any>[]=[];let offset=0,total=1;
    while(offset<total&&offset<10000){const feed=await dex('/manga/'+raw+'/feed',{'translatedLanguage[]':language,'includes[]':'scanlation_group','order[chapter]':'asc',limit:500,offset,includeEmptyPages:0,includeFutureUpdates:0,includeExternalUrl:0});all.push(...feed.data);total=feed.total;offset+=feed.limit;if(!feed.data.length)break;}
    const manga=normalizeManga(metadata.data);return {...wrap(this.id,manga,language),provider_internal_id:raw,chapters:all.filter(c=>c.attributes.pages>0&&!c.attributes.externalUrl&&!c.attributes.isUnavailable).map(c=>{const a=c.attributes;return {provider:this.id,provider_internal_id:c.id,language,chapterNumber:a.chapter!=null&&String(a.chapter).trim()!==''&&Number.isFinite(Number(a.chapter))?Number(a.chapter):null,name:a.title||`Chapter ${a.chapter??'Extra'}`,releaseDate:a.publishAt,team:c.relationships?.filter((r:Record<string,any>)=>r.type==='scanlation_group').map((r:Record<string,any>)=>r.attributes?.name).filter(Boolean).join(' / ')||undefined,priority:this.priority,pageCount:a.pages};})};
  }
  async pages(id:string){const data=await dex('/at-home/server/'+id);if(!data.chapter?.data?.length)throw new Error('No readable pages');return data.chapter.data.map((file:string)=>'/api/mangadex-image?url='+encodeURIComponent(`${data.baseUrl}/data/${data.chapter.hash}/${file}`));}
}

export class WebtoonProvider extends MangaProvider {
  readonly id='webtoon'; readonly languages:Language[]=['en']; readonly priority=80;
  async browse(options:BrowseOptions){const data=await legacy('catalog',{source:'webtoons-en',...options,language:options.type});return {mangas:data.mangas.map((m:Record<string,any>)=>wrap(this.id,m,'en')),hasNextPage:data.hasNextPage};}
  async manga(id:string,language:Language){const data=await legacy('manga',{id});return {...wrap(this.id,data,language),format:'Webtoon',chapters:data.chapters.map((c:Record<string,any>)=>({provider:this.id,provider_internal_id:c.id,language,chapterNumber:Number(c.chapterNumber),name:c.name,releaseDate:c.publishedAt,team:'Official',priority:this.priority,pageCount:c.pageCount}))};}
  async pages(id:string){return (await legacy('pages',{id})).pages;}
}

export class SceneProvider extends MangaProvider {
  readonly id:string;readonly languages:Language[];readonly priority:number;private sourceId:string;private sceneTeam?:string;
  constructor(source:{id:string;lang:Language;name:string}){super();this.id='scene-'+source.id;this.sourceId=source.id;this.languages=[source.lang];this.sceneTeam=/^(Asura Scans|Flame Comics|Reaper Scans|Hive Scans|Void Scans)$/i.test(source.name)?source.name:undefined;this.priority=this.sceneTeam?70:30;}
  async browse(options:BrowseOptions){const client=createSuwayomiClient();if(!client)throw new Error('Edition unavailable');const result=await client.request('mutation($input:FetchSourceMangaInput!){fetchSourceManga(input:$input){hasNextPage mangas{id title thumbnailUrl}}}',{input:{source:this.sourceId,type:options.q?'SEARCH':['new','latest'].includes(options.category)?'LATEST':'POPULAR',query:options.q,page:options.page}});const data={...result.fetchSourceManga,mangas:result.fetchSourceManga.mangas.map((m:Record<string,any>)=>({...m,id:'sw:m:'+m.id,poster:m.thumbnailUrl?'/api/gateway-image?path='+encodeURIComponent(new URL(m.thumbnailUrl,client.base).pathname):''}))};return {mangas:data.mangas.map((m:Record<string,any>)=>wrap(this.id,m,options.language)),hasNextPage:data.hasNextPage};}
  async manga(id:string,language:Language){const client=createSuwayomiClient();if(!client)throw new Error('Edition unavailable');const data=await client.request('mutation($input:FetchMangaAndChaptersInput!){fetchMangaAndChapters(input:$input){manga{id title description author genre thumbnailUrl source{lang name}} chapters{id name chapterNumber sourceOrder uploadDate scanlator pageCount}}}',{input:{id:Number(id.replace(/^sw:m:/,'')),fetchManga:true,fetchChapters:true}});const {manga,chapters}=data.fetchMangaAndChapters;const m=wrap(this.id,{...manga,format:Array.isArray(manga.genre)&&manga.genre.some((g:string)=>/webtoon|manhwa/i.test(g))?'Manhwa':Array.isArray(manga.genre)&&manga.genre.some((g:string)=>/manhua/i.test(g))?'Manhua':undefined,id:'sw:m:'+manga.id,poster:manga.thumbnailUrl?'/api/gateway-image?path='+encodeURIComponent(new URL(manga.thumbnailUrl,client.base).pathname):''},language);return {...m,chapters:chapters.map((c:Record<string,any>)=>({provider:this.id,provider_internal_id:'sw:c:'+c.id,language,chapterNumber:Number.isFinite(Number(c.chapterNumber))&&Number(c.chapterNumber)>=0?Number(c.chapterNumber):null,name:c.name,releaseDate:Number(c.uploadDate)>0?new Date(Number(c.uploadDate)).toISOString():undefined,team:c.scanlator||this.sceneTeam,priority:this.priority,pageCount:c.pageCount||undefined}))};}
  async pages(id:string){return (await legacy('pages',{id})).pages;}
}

export async function providers():Promise<MangaProvider[]>{const base:MangaProvider[]=[new MangaDexProvider(),new WebtoonProvider()];try{const sources=await providerCache.remember('platform:providers',900,async()=>{const client=createSuwayomiClient();if(!client)return [];const data=await client.request('query{sources(first:500){nodes{id name lang}}}');return data.sources.nodes.filter((s:Record<string,any>)=>s.id!=='0'&&['en','id'].includes(s.lang));});for(const source of sources)base.push(new SceneProvider(source));}catch{}return base;}
export async function resolveLegacy(id:string,language:Language){const list=await providers();if(id.startsWith('sw:m:')){const client=createSuwayomiClient();if(!client)throw new Error('Comic unavailable');const result=await client.request('query($id:Int!){manga(id:$id){source{id lang}}}',{id:Number(id.slice(5))});return {provider:'scene-'+result.manga.source.id,provider_internal_id:id,language:result.manga.source.lang as Language};}if(id.startsWith('wt:'))return {provider:'webtoon',provider_internal_id:id,language:'en' as Language};return {provider:'dex',provider_internal_id:id.replace(/^md:id:/,''),language:id.startsWith('md:id:')?'id' as Language:language};}
