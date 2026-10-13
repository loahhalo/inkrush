export const FEATURED_MANGA='9fca3c19-ac41-4ebf-8735-f4e3becc2b3e';
// MangaDex classifies mainstream series such as One Piece and One-Punch Man as suggestive.
export const CATALOG_RATINGS=['safe','suggestive'];
export function normalizeManga(item) {
  const a=item.attributes, cover=item.relationships?.find(r=>r.type==='cover_art')?.attributes?.fileName;
  const title=a.title.en||a.altTitles?.find(t=>t.en)?.en||Object.values(a.title)[0]||'Untitled';
  return {contentRating:a.contentRating||null,demographic:a.publicationDemographic||null,themes:a.tags?.filter(t=>t.attributes.group==='theme').map(t=>t.attributes.name.en)||[],contentTags:a.tags?.filter(t=>t.attributes.group==='content').map(t=>t.attributes.name.en)||[],createdAt:a.createdAt,id:item.id,title,originalLanguage:a.originalLanguage,status:a.status,year:a.year,altTitles:(a.altTitles||[]).flatMap(t=>Object.values(t)),description:(a.description?.en||Object.values(a.description||{})[0]||'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_#]/g,''),author:item.relationships?.find(r=>r.type==='author')?.attributes?.name||'',genre:a.tags?.filter(t=>t.attributes.group==='genre').map(t=>t.attributes.name.en)||[],poster:cover?`https://uploads.mangadex.org/covers/${item.id}/${cover}.256.jpg`:'',sourceLabel:'MANGADEX · LIVE',sourceUrl:`https://mangadex.org/title/${item.id}`};
}
export function normalizeChapters(data,legacyVolumeOrder=false) {
  const number=c=>c.attributes.chapter!=null&&String(c.attributes.chapter).trim()!==''&&Number.isFinite(Number(c.attributes.chapter))?Number(c.attributes.chapter):Infinity;
  const sorted=data.filter(c=>c.attributes.pages>0&&!c.attributes.externalUrl&&!c.attributes.isUnavailable).sort((a,b)=>(legacyVolumeOrder?(Number(a.attributes.volume)||0)-(Number(b.attributes.volume)||0)||(Number(a.attributes.chapter)||0)-(Number(b.attributes.chapter)||0):number(a)-number(b)||(Number(a.attributes.volume)||0)-(Number(b.attributes.volume)||0))||String(a.attributes.publishAt||'').localeCompare(String(b.attributes.publishAt||'')));
  const volumes=new Map();
  for(const c of sorted){const n=number(c);if(n!==Infinity&&c.attributes.volume){if(!volumes.has(n))volumes.set(n,new Set());volumes.get(n).add(c.attributes.volume);}}
  const groups=new Map();
  for(const c of sorted){const a=c.attributes,n=number(c),v=volumes.get(n);const k=legacyVolumeOrder?`${a.volume}:${a.chapter}:${a.chapter==null?c.id:''}`:n===Infinity?c.id:`${v?.size>1?a.volume||'':v?.values().next().value||''}:${n}`;
    if(groups.has(k)){groups.get(k).alternativeIds.push(c.id);continue;}
    groups.set(k,{id:c.id,alternativeIds:[],chapterNumber:n===Infinity?null:a.chapter,volume:a.volume,publishedAt:a.publishAt,name:a.title||(n===Infinity?'Special chapter':`Chapter ${a.chapter}`),pageCount:a.pages});
  }
  return [...groups.values()];
}
export class MangaDexClient {
  constructor(){this.base='https://api.mangadex.org';this.kind='mangadex';this.pageCache=new Map();}
  image(value){return value?.startsWith('/api/mangadex-image?')?value:value?'/api/mangadex-image?url='+encodeURIComponent(value):'';}
  async request(path,params={},signal) {
    const url=new URL('/api/mangadex'+path,location.origin);
    for(const [key,value] of Object.entries(params)){for(const v of Array.isArray(value)?value:[value])url.searchParams.append(key,String(v));}
    const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});
    let data;try{data=await response.json();}catch{throw new Error('The comic source returned an unreadable response.');}
    if(!response.ok||data.result==='error')throw new Error(data.error||data.errors?.[0]?.detail||'The comic source is unavailable. Please retry.');
    return data;
  }
  async sources(){return [{id:'mangadex-en',name:'MangaDex',lang:'en'},{id:'mangadex-id',name:'MangaDex · Bahasa Indonesia',lang:'id'}];}
  async genres(){const data=await this.request('/manga/tag');return data.data.filter(t=>t.attributes.group==='genre').map(t=>({id:t.id,name:t.attributes.name.en})).sort((a,b)=>a.name.localeCompare(b.name));}
  async browse(source,query='',page=1,{category='popular',genre,language,status,signal}={}) {
    const translated=source==='mangadex-id'?'id':'en';
    const params={limit:18,offset:(page-1)*18,'availableTranslatedLanguage[]':translated,'includes[]':['cover_art','author'],'contentRating[]':CATALOG_RATINGS,hasAvailableChapters:'true'};
    if(genre)params['includedTags[]']=genre;
    if(language)params['originalLanguage[]']=language==='zh'?['zh','zh-hk']:language;
    if(status)params['status[]']=status;
    if(query){params.title=query;params['order[relevance]']='desc';}
    else if(category==='latest')params['order[latestUploadedChapter]']='desc';
    else if(category==='new')params['order[createdAt]']='desc';
    else {params['order[followedCount]']='desc';if(category==='trending')params.createdAtSince=new Date(Date.now()-30*86400000).toISOString().slice(0,19);}
    const data=await this.request('/manga',params,signal);
    return {hasNextPage:data.offset+data.limit<data.total,mangas:data.data.map(item=>{const manga=normalizeManga(item);manga.translatedLanguage=translated;if(translated==='id')manga.id='md:id:'+manga.id;manga.poster=this.image(manga.poster);return manga;})};
  }
  async manga(id) {
    const translated=String(id).startsWith('md:id:')?'id':'en',publicId=id;id=String(id).replace(/^md:id:/,'');
    const metadata=await this.request('/manga/'+id,{'includes[]':['cover_art','author']});
    const all=[];let offset=0,total=1;
    while(offset<total&&offset<10000){const feed=await this.request('/manga/'+id+'/feed',{'translatedLanguage[]':translated,'order[volume]':'asc','order[chapter]':'asc',limit:500,offset,includeEmptyPages:0,includeFutureUpdates:0,includeExternalUrl:0});all.push(...feed.data);total=feed.total;offset+=feed.limit;if(!feed.data.length)break;}
    const legacyOrder=normalizeChapters([...all],true).map(c=>c.id);const chapters=normalizeChapters(all);
    const manga=normalizeManga(metadata.data);manga.poster=this.image(manga.poster);
    return {...manga,id:publicId,translatedLanguage:translated,chapters,legacyOrder};
  }
  async pages(id,refresh=false) {
    const cached=this.pageCache.get(id);if(!refresh&&cached&&Date.now()-cached.at<180000)return cached.pages;
    const data=await this.request('/at-home/server/'+id);
    const files=data.chapter.dataSaver?.length?data.chapter.dataSaver:data.chapter.data;
    const quality=data.chapter.dataSaver?.length?'data-saver':'data';
    if(!files?.length)throw new Error('This chapter has no page images. Try another chapter.');
    const pages=files.map(file=>this.image(`${data.baseUrl}/${quality}/${data.chapter.hash}/${file}`));
    this.pageCache.set(id,{at:Date.now(),pages});return pages;
  }
}
