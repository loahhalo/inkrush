import {proxyImage} from '../../lib/mangadex-image.mjs';

const UUID='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
export function coverMangaId(path:string){try{const url=new URL(path);if(url.protocol!=='https:'||url.hostname!=='uploads.mangadex.org'||url.port||url.username||url.password)return null;return url.pathname.match(new RegExp('^/covers/('+UUID+')/[^/]+\\.(?:jpg|png|webp)(?:\\.\\d+\\.jpg)?$','i'))?.[1]||null;}catch{return null;}}
export function trustedCover(url:string){try{const u=new URL(url);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(u.hostname==='s4.anilist.co'&&u.pathname.startsWith('/file/anilistcdn/media/manga/cover/')||u.hostname==='cdn.myanimelist.net'&&/^\/images\/manga\//.test(u.pathname));}catch{return false;}}
type Entry={url:string|null;expires:number};
type Job={resolve:(url:string|null)=>void};

// Exact external IDs from official metadata only. Batch cold cover lookups so a grid
// needs one metadata query and one AniList query instead of a request per card.
export class CoverImages {
  private entries=new Map<string,Entry>();private pending=new Map<string,Promise<string|null>>();private queued=new Map<string,Job>();private running=false;
  private fetcher:typeof fetch;private now:()=>number;private blockedUntil=0;
  constructor(options:{fetcher?:typeof fetch;now?:()=>number}={}){this.fetcher=options.fetcher||((...args)=>fetch(...args));this.now=options.now||Date.now;}
  private async json(url:string,init:RequestInit={},timeout=10000){const r=await this.fetcher(url,{...init,redirect:'manual',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error('Cover metadata unavailable');return r.json();}
  private finish(id:string,job:Job,url:string|null){if(this.entries.size>=500)this.entries.delete(this.entries.keys().next().value!);this.entries.set(id,{url,expires:this.now()+(url?86400000:30000)});this.pending.delete(id);job.resolve(url);}
  async resolve(id:string):Promise<string|null>{
    const old=this.entries.get(id);if(old&&old.expires>this.now())return old.url;
    const pending=this.pending.get(id);if(pending)return pending;
    const promise=new Promise<string|null>(resolve=>this.queued.set(id,{resolve}));this.pending.set(id,promise);
    if(!this.running){this.running=true;setTimeout(()=>{void this.drain();},30);}return promise;
  }
  private async drain(){
    while(this.queued.size){
      const batch=[...this.queued.entries()].slice(0,50);for(const [id]of batch)this.queued.delete(id);
      const covers=new Map<string,string>(),malIds=new Map<string,number>();
      try{
        const params=new URLSearchParams({limit:'100'});for(const [id]of batch)params.append('ids[]',id);for(const rating of ['safe','suggestive','erotica','pornographic'])params.append('contentRating[]',rating);
        const metadata=await this.json('https://api.mangadex.org/manga?'+params),alIds=new Map<string,number>();
        for(const m of metadata.data||[]){const links=m.attributes?.links||{};if(/^\d+$/.test(links.al||''))alIds.set(m.id,Number(links.al));if(/^\d+$/.test(links.mal||''))malIds.set(m.id,Number(links.mal));}
        if(alIds.size){const data=await this.json('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:MANGA){id coverImage{large}}}}',variables:{ids:[...new Set(alIds.values())]}})});const media=new Map((data.data?.Page?.media||[]).map((m:any)=>[m.id,m.coverImage?.large]));for(const [id,al]of alIds){const url=media.get(al);if(typeof url==='string'&&trustedCover(url))covers.set(id,url);}}
      }catch{}
      const remaining=new Map(batch);for(const [id,url]of covers){const job=remaining.get(id);if(job){this.finish(id,job,url);remaining.delete(id);}}
      // Return available artwork immediately. Bound secondary lookups so an outage
      // cannot hold an entire grid open for minutes.
      const deadline=Date.now()+12000;
      for(const [id,mal]of malIds)if(!covers.has(id)){
        if(Date.now()>=deadline)break;
        try{const data=await this.json('https://api.jikan.moe/v4/manga/'+mal,{},Math.max(1,Math.min(4000,deadline-Date.now())));const url=data.data?.images?.webp?.image_url||data.data?.images?.jpg?.image_url;if(typeof url==='string'&&trustedCover(url))covers.set(id,url);}catch{}
        const job=remaining.get(id);if(job){this.finish(id,job,covers.get(id)||null);remaining.delete(id);}
        await new Promise(resolve=>setTimeout(resolve,350));
      }
      for(const [id,job]of remaining)this.finish(id,job,null);
      if(this.queued.size)await new Promise(resolve=>setTimeout(resolve,1000));
    }
    this.running=false;
  }
  async load(path:string){
    const id=coverMangaId(path);if(!id)return proxyImage(new Request('https://internal/api/mangadex-image?url='+encodeURIComponent(path)));
    if(this.now()>=this.blockedUntil){const original=await proxyImage(new Request('https://internal/api/mangadex-image?url='+encodeURIComponent(path)));if(original.ok)return original;if(original.headers.get('X-Upstream-Status')==='403')this.blockedUntil=this.now()+300000;await original.body?.cancel();}
    const url=await this.resolve(id);if(!url)return new Response('Cover unavailable',{status:502});
    try{const r=await this.fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});const type=r.headers.get('Content-Type')||'';if(!r.ok||!/^image\/(?:jpeg|jpg|png|webp|avif)(?:;|$)/i.test(type)||Number(r.headers.get('Content-Length')||0)>8*1024*1024){await r.body?.cancel();return new Response('Cover unavailable',{status:502});}return new Response(r.body,{headers:{'Content-Type':type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Cover unavailable',{status:502});}
  }
}
export const coverImages=new CoverImages();
