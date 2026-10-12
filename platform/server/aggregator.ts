import {Cache} from '../../lib/cache.mjs';
import {seal,unseal} from './identity.ts';
import {imageUrl} from './image-proxy.ts';
import {MangaProvider,providers,resolveLegacy} from './providers.ts';
import type {BrowseOptions,InternalManga,InternalRelease,ProviderRef,Comic,ComicDetail,Chapter,Language,Catalog} from './types.ts';

export function normalizedTitle(title:string){return title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
export function sameTitle(a:InternalManga,b:InternalManga){if(a.language!==b.language)return false;const titles=new Set([a.title,...a.altTitles||[]].map(normalizedTitle).filter(Boolean));return [b.title,...b.altTitles||[]].some(t=>titles.has(normalizedTitle(t)));}
export function detectGaps(chapters:{chapterNumber:number|null}[],limit=300){const nums=[...new Set(chapters.map(c=>c.chapterNumber).filter((n):n is number=>n!==null&&Number.isInteger(n)&&n>=0&&n<=10000))].sort((a,b)=>a-b);const gaps:number[]=[];if(!nums.length)return gaps;for(let n=nums[0]===0?0:1;n<nums.at(-1)!&&gaps.length<limit;n++)if(!nums.includes(n))gaps.push(n);return gaps;}
export function cleanText(value:unknown,fallback=''){const text=String(value||'').split(/(?:^|\n)\s*(?:---\s*)?(?:Links|Official links)\s*:/i)[0].replace(/https?:\/\/\S+/gi,'').replace(/\b(?:Suwayomi|MangaDex|MangaFox|Fanfox|MangaKakalot|Komiku|Komikcast|Kiryuu|Shinigami|Bato(?:\.to)?|Weeb Central|MangaKatana)\b[^\n.]*/gi,'').replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').trim();return text||fallback;}
function teamName(value:string|undefined){return !value||/^(unknown|none|n\/a)$/i.test(value.trim())?'Translation team':cleanText(value,'Translation team').slice(0,100);}
function publicComic(m:InternalManga):Comic{return {id:seal('m',{provider:m.provider,provider_internal_id:m.provider_internal_id,language:m.language}),title:cleanText(m.title,'Untitled'),author:cleanText(m.author),description:cleanText(m.description),genre:(m.genre||[]).map(g=>cleanText(g)).filter(Boolean),cover:imageUrl(m.poster||''),language:m.language,format:m.format||'Manga',status:m.status||'',latestChapter:m.latestChapter,releaseDate:m.releaseDate};}
export function mergeReleases(releases:InternalRelease[]):Chapter[]{const groups=new Map<string,InternalRelease[]>();for(const release of releases){const key=release.chapterNumber===null?'extra:'+release.provider+':'+release.provider_internal_id:String(release.chapterNumber);if(!groups.has(key))groups.set(key,[]);const list=groups.get(key)!;if(!list.some(r=>r.provider===release.provider&&r.provider_internal_id===release.provider_internal_id))list.push(release);}
  return [...groups.values()].map(list=>{list.sort((a,b)=>(b.priority||0)-(a.priority||0)||(b.resolution||0)-(a.resolution||0)||String(b.releaseDate||'').localeCompare(String(a.releaseDate||'')));const first=list[0],refs=list.map(r=>({provider:r.provider,provider_internal_id:r.provider_internal_id,language:r.language}));const releases=list.map(r=>({id:seal('r',{provider:r.provider,provider_internal_id:r.provider_internal_id,language:r.language}),team:teamName(r.team),releaseDate:r.releaseDate,pageCount:r.pageCount}));return {id:seal('c',{refs}),chapterNumber:first.chapterNumber,name:cleanText(first.name,first.chapterNumber===null?'Extra':`Chapter ${first.chapterNumber}`),releaseDate:first.releaseDate,releases};}).sort((a,b)=>(a.chapterNumber??Infinity)-(b.chapterNumber??Infinity)||String(a.releaseDate||'').localeCompare(String(b.releaseDate||'')));
}
const cache=new Cache();
// Reuse exact upstream editions across different catalog cards and aliases.
function mangaFrom(provider:MangaProvider,id:string,language:Language){return cache.remember('platform:v3:edition:'+seal('m',{provider:provider.id,provider_internal_id:id,language}),900,()=>provider.manga(id,language));}
function providerSearch(provider:MangaProvider,q:string,language:Language):ReturnType<MangaProvider['browse']>{return cache.remember('platform:v3:match:'+JSON.stringify([provider.id,q.toLowerCase().trim().replace(/\s+/g,' '),language]),(result:{mangas:InternalManga[]})=>result.mangas.length?900:60,()=>provider.browse({q,language,category:'popular',page:1}));}
export function findChapter(chapters:Chapter[],id?:string){
  if(!id)return undefined;const exact=chapters.find(c=>c.id===id);if(exact)return exact;
  // Added releases change the encrypted chapter ID. Old links/progress still resolve by release membership.
  try{const old=unseal<{refs:ProviderRef[]}>('c',id).refs;return chapters.find(c=>unseal<{refs:ProviderRef[]}>('c',c.id).refs.some(r=>old.some(o=>o.provider===r.provider&&o.provider_internal_id===r.provider_internal_id&&o.language===r.language)));}catch{return undefined;}
}
export class MangaAggregatorService {
  private getProviders:()=>Promise<MangaProvider[]>;
  constructor(getProviders=providers){this.getProviders=getProviders;}
  async catalog(options:BrowseOptions):Promise<Catalog>{return cache.remember('platform:v3:catalog:'+JSON.stringify(options),(result:Catalog)=>result.partial?60:900,async()=>{const registered=(await this.getProviders()).filter(p=>p.languages.includes(options.language));const selected=registered.filter(p=>!options.type||p.id==='dex'||options.type==='ko'&&p.id==='webtoon').slice(0,8);const results=await Promise.allSettled(selected.map(p=>options.q&&options.page===1&&!options.type&&!options.genre?providerSearch(p,options.q,options.language):p.browse(options)));const mangas:InternalManga[]=[];let partial=false,hasNextPage=false;for(const r of results)if(r.status==='fulfilled'){mangas.push(...r.value.mangas.filter(m=>!options.q||[m.title,...m.altTitles||[]].some(t=>normalizedTitle(t).includes(normalizedTitle(options.q)))));hasNextPage ||=r.value.hasNextPage;}else partial=true;const unique:InternalManga[]=[];for(const manga of mangas)if(!unique.some(m=>sameTitle(m,manga)))unique.push(manga);if(!unique.length&&partial)throw new Error('Catalog temporarily unavailable');return {comics:unique.map(publicComic),hasNextPage,partial};});}
  async detail(id:string,language:Language='en'):Promise<ComicDetail>{
    const ref=id.startsWith('m_')?unseal<ProviderRef>('m',id):await resolveLegacy(id,language);
    return cache.remember('platform:v3:detail:'+seal('m',ref),(result:ComicDetail)=>result.incomplete||result.gaps.length?60:1200,async()=>{
      const registered=await this.getProviders(),primary=registered.find(p=>p.id===ref.provider);
      if(!primary)throw new Error('Edition unavailable');
      let baseline:InternalManga & {chapters:InternalRelease[]};
      try{baseline=await mangaFrom(primary,ref.provider_internal_id,ref.language);}catch{throw new Error('This comic is temporarily unavailable. Please retry.');}
      const releases=[...baseline.chapters];let incomplete=false;
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
            const result=await providerSearch(p,q,ref.language);
            const match=result.mangas.find(m=>sameTitle(baseline,m));
            if(match){const edition=await mangaFrom(p,match.provider_internal_id,ref.language);return sameTitle(baseline,edition)?edition:null;}
          }
          return null;
        }));
        for(const result of matches)if(result.status==='fulfilled'&&result.value)releases.push(...result.value.chapters);else if(result.status==='rejected')incomplete=true;
      }
      const chapters=mergeReleases(releases),latest=chapters.reduce((n,c)=>Math.max(n,c.chapterNumber??0),0);
      return {...publicComic(baseline),latestChapter:latest||baseline.latestChapter,chapters,gaps:detectGaps(chapters),incomplete};
    });
  }
  async pages(chapterId:string,releaseId?:string){const refs=unseal<{refs:ProviderRef[]}>('c',chapterId).refs;if(!Array.isArray(refs)||!refs.length||refs.length>30)throw new Error('Invalid chapter');let ordered=refs;if(releaseId){const chosen=unseal<ProviderRef>('r',releaseId);const existing=refs.find(r=>r.provider===chosen.provider&&r.provider_internal_id===chosen.provider_internal_id&&r.language===chosen.language);if(!existing)throw new Error('Invalid release');ordered=[existing,...refs.filter(r=>r!==existing)];}
    const registered=await this.getProviders();for(const ref of ordered){try{const provider=registered.find(p=>p.id===ref.provider);if(!provider)continue;const pages:string[]=await cache.remember('platform:v2:pages:'+seal('r',ref),180,()=>provider.pages(ref.provider_internal_id));if(!pages.length)continue;return {pages:pages.map(src=>({src:imageUrl(src)})),releaseId:seal('r',ref),fallbackUsed:ref!==ordered[0]};}catch{}}
    throw new Error('This chapter is temporarily unavailable. Try another release or retry shortly.');
  }
}
export const aggregator=new MangaAggregatorService();
