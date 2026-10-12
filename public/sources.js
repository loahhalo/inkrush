import {CENTRAL_ENABLED} from './source-config.js';
import {SOLO_LEVELING,isSoloLeveling} from './publisher-titles.js';
import {MangaDexClient} from './mangadex.js';

export class WebtoonClient {
  constructor(){this.base='https://www.webtoons.com';this.kind='webtoon';this.endpoint='/api/gateway';this.pageCache=new Map();}
  image(value){return value||'';}
  async request(action,params={},signal){const url=new URL(this.endpoint,location.origin);url.searchParams.set('action',action);if(this.kind==='webtoon')url.searchParams.set('source','webtoons-en');for(const [k,v]of Object.entries(params))url.searchParams.set(k,v);
    const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});const result=await response.json();if(!response.ok){const error=new Error(result.error||'WEBTOON is unavailable. Please retry.');error.sourceUrl=result.sourceUrl;error.code=result.code;throw error;}return result;
  }
  browse(source,query='',page=1,{category='trending',signal,language,status,genreName}={}){return this.request('catalog',{q:query,page,category,...(language?{language}:{}),...(status?{status}:{}),...(genreName?{genreName}:{})},signal);}
  manga(id){return this.request('manga',{id});}
  async pages(id,refresh=false){const cached=this.pageCache.get(id);if(!refresh&&cached&&Date.now()-cached.at<120000)return cached.pages;const {pages}=await this.request('pages',{id});this.pageCache.set(id,{pages,at:Date.now()});return pages;}
}
export class GatewayClient extends MangaDexClient {
  async gateway(action,params={},signal){const url=new URL('/api/gateway',location.origin);url.searchParams.set('action',action);for(const [k,v]of Object.entries(params))if(v!==undefined&&k!=='signal')url.searchParams.set(k,v);const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Comic source unavailable');return data;}
  async browse(source,q='',page=1,options={}){const result=await this.gateway('catalog',{source,q,page,...options},options.signal);return {...result,mangas:result.mangas.map(m=>({...m,poster:m.poster?.startsWith('/api/')?m.poster:this.image(m.poster)}))};}
  manga(id){return this.gateway('manga',{id});}
  async pages(id,refresh=false){const cached=this.pageCache.get(id);if(!refresh&&cached&&Date.now()-cached.at<60000)return cached.pages;const result=await this.gateway('pages',{id});this.pageCache.set(id,{at:Date.now(),pages:result.pages});return result.pages;}
}
export class PublicComicClient {
  constructor(){this.base='https://api.mangadex.org';this.kind='public';this.dex=new GatewayClient();this.webtoon=new WebtoonClient();this.central=new WebtoonClient();this.central.base='https://weebcentral.com';this.central.kind='central';this.central.endpoint='/api/central';}
  async sources(){let extra=[];try{extra=(await this.dex.gateway('sources')).sources.filter(s=>s.id.startsWith('sw:'));}catch{}return [...(CENTRAL_ENABLED?[{id:'central-en',name:'Weeb Central',lang:'en'}]:[]),{id:'webtoons-en',name:'WEBTOON',lang:'en'},{id:'mangadex-en',name:'MangaDex',lang:'en'},{id:'mangadex-id',name:'MangaDex · Bahasa Indonesia',lang:'id'},...extra];}
  image(value){return value?.startsWith('/api/')?value:this.dex.image(value);}
  genres(){return this.dex.genres();}
  async browse(source,...args){const result=await (source==='central-en'?this.central:source==='webtoons-en'?this.webtoon:this.dex).browse(source,...args);if(['mangadex-en','webtoons-en'].includes(source)&&isSoloLeveling(args[0]||''))result.mangas=[SOLO_LEVELING,...result.mangas];return result;}
  manga(id){if(id===SOLO_LEVELING.id)return Promise.resolve(SOLO_LEVELING);if(String(id).startsWith('wc:')&&!CENTRAL_ENABLED){const error=new Error('This source blocks requests from the hosted reader. Open the provider directly or use the local reader.');error.sourceUrl='https://weebcentral.com/series/'+String(id).slice(3);return Promise.reject(error);}return (String(id).startsWith('wc:')?this.central:String(id).startsWith('wt:')?this.webtoon:this.dex).manga(id);}
  pages(id,refresh=false){return (String(id).startsWith('wc:')?this.central:String(id).startsWith('wt:')?this.webtoon:this.dex).pages(id,refresh);}
}
