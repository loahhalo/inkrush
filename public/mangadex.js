export const FEATURED_MANGA='9fca3c19-ac41-4ebf-8735-f4e3becc2b3e';
export function normalizeManga(item) {
  const a=item.attributes, cover=item.relationships?.find(r=>r.type==='cover_art')?.attributes?.fileName;
  const title=a.title.en||a.altTitles?.find(t=>t.en)?.en||Object.values(a.title)[0]||'Untitled';
  return {id:item.id,title,description:(a.description.en||Object.values(a.description)[0]||'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_#]/g,''),author:item.relationships?.find(r=>r.type==='author')?.attributes?.name||'',genre:a.tags?.filter(t=>t.attributes.group==='genre').map(t=>t.attributes.name.en)||[],poster:cover?`https://uploads.mangadex.org/covers/${item.id}/${cover}.256.jpg`:'',sourceLabel:'MANGADEX · LIVE',sourceUrl:`https://mangadex.org/title/${item.id}`};
}
export function normalizeChapters(data,legacyVolumeOrder=false) {
  const seen=new Set();
  return data.filter(c=>c.attributes.pages>0&&!c.attributes.externalUrl&&!c.attributes.isUnavailable).sort((a,b)=>(legacyVolumeOrder?(Number(a.attributes.volume)||0)-(Number(b.attributes.volume)||0)||(Number(a.attributes.chapter)||0)-(Number(b.attributes.chapter)||0):(a.attributes.chapter==null?Infinity:Number(a.attributes.chapter))-(b.attributes.chapter==null?Infinity:Number(b.attributes.chapter))||(Number(a.attributes.volume)||0)-(Number(b.attributes.volume)||0))||a.attributes.publishAt.localeCompare(b.attributes.publishAt)).filter(c=>{const k=`${c.attributes.volume}:${c.attributes.chapter}:${c.attributes.chapter===null?c.id:''}`;if(seen.has(k))return false;seen.add(k);return true;}).map((c,i)=>({id:c.id,chapterNumber:c.attributes.chapter??i+1,name:c.attributes.title||`Chapter ${c.attributes.chapter??i+1}`,pageCount:c.attributes.pages}));
}
export class MangaDexClient {
  constructor(){this.base='https://api.mangadex.org';this.kind='mangadex';this.pageCache=new Map();}
  image(value){return value?.startsWith('/api/mangadex-image?')?value:value?'/api/mangadex-image?url='+encodeURIComponent(value):'';}
  async request(path,params={}) {
    const url=new URL('/api/mangadex'+path,location.origin);
    for(const [key,value] of Object.entries(params)){for(const v of Array.isArray(value)?value:[value])url.searchParams.append(key,String(v));}
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    let data;try{data=await response.json();}catch{throw new Error('The comic source returned an unreadable response.');}
    if(!response.ok||data.result==='error')throw new Error(data.error||data.errors?.[0]?.detail||'The comic source is unavailable. Please retry.');
    return data;
  }
  async sources(){return [{id:'mangadex-en',name:'MangaDex',lang:'en'}];}
  async browse(source,query='',page=1) {
    const params={limit:18,offset:(page-1)*18,'availableTranslatedLanguage[]':'en','includes[]':['cover_art','author'],'contentRating[]':'safe','order[followedCount]':'desc'};
    if(query)params.title=query;
    const data=await this.request('/manga',params);
    return {hasNextPage:data.offset+data.limit<data.total,mangas:data.data.map(item=>{const manga=normalizeManga(item);manga.poster=this.image(manga.poster);return manga;})};
  }
  async manga(id) {
    const metadata=await this.request('/manga/'+id,{'includes[]':['cover_art','author']});
    const all=[];let offset=0,total=1;
    while(offset<total&&offset<10000){const feed=await this.request('/manga/'+id+'/feed',{'translatedLanguage[]':'en','order[volume]':'asc','order[chapter]':'asc',limit:500,offset,includeEmptyPages:0,includeFutureUpdates:0,includeExternalUrl:0});all.push(...feed.data);total=feed.total;offset+=feed.limit;if(!feed.data.length)break;}
    const legacyOrder=normalizeChapters([...all],true).map(c=>c.id);const chapters=normalizeChapters(all);
    if(!chapters.length)throw new Error('No readable English chapters are available for this title. Try another story.');
    const manga=normalizeManga(metadata.data);manga.poster=this.image(manga.poster);
    return {...manga,chapters,legacyOrder};
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
