import {matchesSeries,ambiguousTitle,seriesIdentity} from './series-identity.ts';
import {LiveFeedCache} from './live-feed.ts';
import {mergeMetadata,catalogRank} from './catalog-metadata.ts';
import {defaultPreferences,matchesPreferences,comicType} from '../shared/content.ts';
import type {ContentPreferences} from '../shared/content.ts';
import {Cache} from '../../lib/cache.mjs';
import {seal,unseal} from './identity.ts';
import {imageUrl} from './image-proxy.ts';
import {MangaProvider,providers,resolveLegacy} from './providers.ts';
import type {BrowseOptions,InternalManga,InternalRelease,ProviderRef,Comic,ComicDetail,Chapter,Language,Catalog} from './types.ts';

export function normalizedTitle(title:string){return title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
export const sameTitle=matchesSeries;
export function detectGaps(chapters:{chapterNumber:number|null}[],limit=300){const nums=[...new Set(chapters.map(c=>c.chapterNumber).filter((n):n is number=>n!==null&&Number.isInteger(n)&&n>=0&&n<=10000))].sort((a,b)=>a-b);const gaps:number[]=[];if(!nums.length)return gaps;for(let n=nums[0]===0?0:1;n<nums.at(-1)!&&gaps.length<limit;n++)if(!nums.includes(n))gaps.push(n);return gaps;}
export function cleanText(value:unknown,fallback=''){const text=String(value||'').split(/(?:^|\n)\s*(?:---\s*)?(?:Links|Official links)\s*:/i)[0].replace(/https?:\/\/\S+/gi,'').replace(/\b(?:Suwayomi|MangaDex|MangaFox|Fanfox|MangaKakalot|Komiku|Komikcast|Kiryuu|Shinigami|Bato(?:\.to)?|Weeb Central|MangaKatana)\b[^\n.]*/gi,'').replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').trim();return text||fallback;}
function teamName(value:string|undefined){return !value||/^(unknown|none|n\/a)$/i.test(value.trim())?'Translation team':cleanText(value,'Translation team').slice(0,100);}
function publicComic(m:InternalManga):Comic{const identity=seriesIdentity(m);if(identity)m={...m,format:identity==='wind-breaker-japan'?'Manga':'Manhwa'};return {id:seal('m',{provider:m.provider,provider_internal_id:m.provider_internal_id,language:m.language}),title:cleanText(m.title,'Untitled'),author:cleanText(m.author),description:cleanText(m.description),genre:(m.genre||[]).map(g=>cleanText(g)).filter(Boolean),cover:imageUrl(m.poster||''),language:m.language,format:m.format||'Manga',status:m.status||'',themes:(m.themes||[]).map(t=>cleanText(t)).filter(Boolean),contentTags:(m.contentTags||[]).map(t=>cleanText(t)).filter(Boolean),contentRating:m.contentRating||null,demographic:m.demographic||null,createdAt:m.createdAt,latestChapter:m.latestChapter,releaseDate:m.releaseDate};}
export function mergeReleases(releases:InternalRelease[]):Chapter[]{const groups=new Map<string,InternalRelease[]>();for(const release of releases){const key=release.chapterNumber===null?'extra:'+release.provider+':'+release.provider_internal_id:String(release.chapterNumber);if(!groups.has(key))groups.set(key,[]);const list=groups.get(key)!;if(!list.some(r=>r.provider===release.provider&&r.provider_internal_id===release.provider_internal_id))list.push(release);}
  return [...groups.values()].map(list=>{list.sort((a,b)=>(b.priority||0)-(a.priority||0)||(b.resolution||0)-(a.resolution||0)||String(b.releaseDate||'').localeCompare(String(a.releaseDate||'')));const first=list[0],refs=list.map(r=>({provider:r.provider,provider_internal_id:r.provider_internal_id,language:r.language}));const releases=list.map(r=>({id:seal('r',{provider:r.provider,provider_internal_id:r.provider_internal_id,language:r.language}),team:teamName(r.team),releaseDate:r.releaseDate,pageCount:r.pageCount}));return {id:seal('c',{refs}),chapterNumber:first.chapterNumber,name:cleanText(first.name,first.chapterNumber===null?'Extra':`Chapter ${first.chapterNumber}`),releaseDate:first.releaseDate,releases};}).sort((a,b)=>(a.chapterNumber??Infinity)-(b.chapterNumber??Infinity)||String(a.releaseDate||'').localeCompare(String(b.releaseDate||'')));
}
const cache=new Cache();
// Reuse exact upstream editions across different catalog cards and aliases.
function mangaFrom(provider:MangaProvider,id:string,language:Language){return cache.remember('platform:v5:edition:'+seal('m',{provider:provider.id,provider_internal_id:id,language}),120,()=>provider.manga(id,language));}
function providerSearch(provider:MangaProvider,q:string,language:Language,preferences?:ContentPreferences,metadataOnly=false):ReturnType<MangaProvider['browse']>{return cache.remember('platform:v5:match:'+JSON.stringify([provider.id,q.toLowerCase().trim().replace(/\s+/g,' '),language,preferences?.ratings.filter(r=>r!=='unrated')||['safe','suggestive'],metadataOnly]),(result:{mangas:InternalManga[]})=>result.mangas.length?120:60,()=>provider.browse({q,language,category:'popular',page:1,preferences,metadataOnly}));}
const knownMetadata=new Map<string,InternalManga>();
function metadataKey(m:InternalManga){return JSON.stringify([m.provider,m.provider_internal_id,m.language]);}
function rememberMetadata(m:InternalManga){if(knownMetadata.size>=500)knownMetadata.delete(knownMetadata.keys().next().value!);knownMetadata.set(metadataKey(m),m);}

export function findChapter(chapters:Chapter[],id?:string){
  if(!id)return undefined;const exact=chapters.find(c=>c.id===id);if(exact)return exact;
  // Added releases change the encrypted chapter ID. Old links/progress still resolve by release membership.
  try{const old=unseal<{refs:ProviderRef[]}>('c',id).refs;return chapters.find(c=>unseal<{refs:ProviderRef[]}>('c',c.id).refs.some(r=>old.some(o=>o.provider===r.provider&&o.provider_internal_id===r.provider_internal_id&&o.language===r.language)));}catch{return undefined;}
}
export class MangaAggregatorService {
  private getProviders:()=>Promise<MangaProvider[]>;
  constructor(getProviders=providers){this.getProviders=getProviders;}
  async summary(id:string):Promise<Comic>{const ref=unseal<ProviderRef>('m',id);return cache.remember('platform:v2:summary:'+id,900,async()=>{const provider=(await this.getProviders()).find(p=>p.id===ref.provider&&p.languages.includes(ref.language));if(!provider)throw new Error('Edition unavailable');const metadata=await provider.metadata(ref.provider_internal_id,ref.language);const known=knownMetadata.get(metadataKey(metadata));return publicComic(known&&sameTitle(metadata,known)?mergeMetadata(metadata,known):metadata);});}
  private catalogCache=new LiveFeedCache<Pick<Catalog,'comics'|'hasNextPage'|'partial'>>();
  async catalog(options:BrowseOptions):Promise<Catalog>{
    const preferences=options.preferences||defaultPreferences(),key=JSON.stringify([options.q,options.language,options.category,options.page,preferences.ratings]);
    const snapshot=await this.catalogCache.read(key,async()=>{
      const registered=(await this.getProviders()).filter(p=>p.languages.includes(options.language)).slice(0,8);
      const results=await Promise.allSettled(registered.map(p=>options.q&&options.page===1?providerSearch(p,options.q,options.language,preferences):p.browse({...options,type:undefined,preferences})));
      const unique:{manga:InternalManga;rank:number}[]=[];let partial=false,hasNextPage=false,succeeded=0;
      for(const result of results){if(result.status==='rejected'){partial=true;continue;}succeeded++;hasNextPage ||=result.value.hasNextPage;
      await Promise.all(result.value.mangas.map(async(manga,index)=>{if(!ambiguousTitle(manga))return;const provider=registered.find(p=>p.id===manga.provider);if(!provider)return;try{const metadata=await cache.remember('platform:v1:identity:'+metadataKey(manga),900,()=>provider.metadata(manga.provider_internal_id,manga.language));result.value.mangas[index]=metadata;}catch{}}));
        result.value.mangas.forEach((manga,index)=>{if(options.q&&![manga.title,...manga.altTitles||[]].some(t=>normalizedTitle(t).includes(normalizedTitle(options.q))))return;const known=knownMetadata.get(metadataKey(manga));if(known&&sameTitle(manga,known))manga=mergeMetadata(manga,known);const existing=unique.find(item=>sameTitle(item.manga,manga));if(existing){existing.manga=mergeMetadata(existing.manga,manga);existing.rank+=1/(20+index);}else unique.push({manga,rank:1/(20+index)});});
      }
      if(!succeeded||!unique.length&&partial)throw new Error('Catalog temporarily unavailable');
      const mangas=options.q?unique.map(item=>item.manga):catalogRank(unique,options.category);
      return {comics:mangas.map(m=>({...publicComic(m),description:''})),hasNextPage,partial};
    },options.fresh===true);
    const type=({ja:'Manga',ko:'Manhwa',zh:'Manhua',other:'Other'} as Record<string,string>)[options.type||''];
    return {...snapshot.value,comics:snapshot.value.comics.filter(comic=>matchesPreferences(comic,preferences)&&(!type||comicType(comic.format)===type)),updatedAt:snapshot.updatedAt,refreshing:snapshot.refreshing,stale:snapshot.stale,refreshAfter:snapshot.refreshAfter};
  }
  async detail(id:string,language:Language='en'):Promise<ComicDetail>{
    const ref=id.startsWith('m_')?unseal<ProviderRef>('m',id):await resolveLegacy(id,language);
    return cache.remember('platform:v5:detail:'+seal('m',ref),(result:ComicDetail)=>result.incomplete||result.gaps.length?60:120,async()=>{
      const registered=await this.getProviders(),primary=registered.find(p=>p.id===ref.provider);
      if(!primary)throw new Error('Edition unavailable');
      let baseline:InternalManga & {chapters:InternalRelease[]};
      try{baseline=await mangaFrom(primary,ref.provider_internal_id,ref.language);}catch{throw new Error('This comic is temporarily unavailable. Please retry.');}
      const releases=[...baseline.chapters];let incomplete=false;let metadata=baseline as InternalManga;
      // A contiguous feed may stop hundreds of chapters early. Always compare matching editions,
      // even with no numerical gaps. WEBTOON originals stay with their official episode numbering.
      if(primary.id!=='webtoon'){
        const secondaries=registered.filter(p=>p.id!==primary.id&&p.languages.includes(ref.language)&&p.id!=='webtoon').slice(0,5);
        const matches=await Promise.allSettled(secondaries.map(async p=>{
          // Some upstream search engines treat punctuation literally ("One-Punch Man"
          // fails while "One Punch Man" succeeds). Matching still requires an exact alias.
          const plain=baseline.title.normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
          const aliases=(baseline.altTitles||[]).filter(t=>/[a-z]/i.test(t));
          const queries=[...new Set([baseline.title,plain,...aliases].filter(Boolean))].slice(0,3);
          for(const q of queries){
            const result=await providerSearch(p,q,ref.language,undefined,p.id==='dex');
            for(let match of result.mangas){if(ambiguousTitle(baseline)&&ambiguousTitle(match)&&!seriesIdentity(match)){try{match=await p.metadata(match.provider_internal_id,ref.language);}catch{continue;}}if(!sameTitle(baseline,match))continue;const edition=await mangaFrom(p,match.provider_internal_id,ref.language);if(sameTitle(baseline,edition))return edition;}
          }
          return null;
        }));
        for(const result of matches)if(result.status==='fulfilled'&&result.value){releases.push(...result.value.chapters);metadata=mergeMetadata(metadata,result.value);}else if(result.status==='rejected')incomplete=true;
      }
      const chapters=mergeReleases(releases),latest=chapters.reduce((n,c)=>Math.max(n,c.chapterNumber??0),0);
      rememberMetadata(metadata);return {...publicComic(metadata),latestChapter:latest||baseline.latestChapter,chapters,gaps:detectGaps(chapters),incomplete};
    });
  }
  async pages(chapterId:string,releaseId?:string){const refs=unseal<{refs:ProviderRef[]}>('c',chapterId).refs;if(!Array.isArray(refs)||!refs.length||refs.length>30)throw new Error('Invalid chapter');let ordered=refs;if(releaseId){const chosen=unseal<ProviderRef>('r',releaseId);const existing=refs.find(r=>r.provider===chosen.provider&&r.provider_internal_id===chosen.provider_internal_id&&r.language===chosen.language);if(!existing)throw new Error('Invalid release');ordered=[existing,...refs.filter(r=>r!==existing)];}
    const registered=await this.getProviders();for(const ref of ordered){try{const provider=registered.find(p=>p.id===ref.provider);if(!provider)continue;const pages:string[]=await cache.remember('platform:v2:pages:'+seal('r',ref),180,()=>provider.pages(ref.provider_internal_id));if(!pages.length)continue;return {pages:pages.map(src=>({src:imageUrl(src)})),releaseId:seal('r',ref),fallbackUsed:ref!==ordered[0]};}catch{}}
    throw new Error('This chapter is temporarily unavailable. Try another release or retry shortly.');
  }
}
export const aggregator=new MangaAggregatorService();
