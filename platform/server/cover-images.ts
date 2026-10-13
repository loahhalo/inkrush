import {proxyImage} from '../../lib/mangadex-image.mjs';
const UUID='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
export function coverMangaId(path:string){try{const url=new URL(path);if(url.protocol!=='https:'||url.hostname!=='uploads.mangadex.org'||url.port||url.username||url.password||url.search||url.hash)return null;return url.pathname.match(new RegExp('^/covers/('+UUID+')/[^/]+\\.(?:jpg|png|webp)(?:\\.\\d+\\.jpg)?$','i'))?.[1]||null;}catch{return null;}}
// Both routes download the identical source URL. The existing Vercel service can
// reach the original cover CDN when its Railway route receives a 403. No artwork
// lookup, title matching, metadata substitutions or client-visible upstream URLs.
export class CoverImages {
  private fetcher:typeof fetch;private now:()=>number;private blockedUntil=0;
  constructor(options:{fetcher?:typeof fetch;now?:()=>number}={}){this.fetcher=options.fetcher||((...args)=>fetch(...args));this.now=options.now||Date.now;}
  async load(path:string){
    if(!coverMangaId(path))return proxyImage(new Request('https://internal/api/mangadex-image?url='+encodeURIComponent(path)));
    if(this.now()>=this.blockedUntil){const original=await proxyImage(new Request('https://internal/api/mangadex-image?url='+encodeURIComponent(path)));if(original.ok)return original;if(original.headers.get('X-Upstream-Status')==='403')this.blockedUntil=this.now()+300000;await original.body?.cancel();}
    try{
      const relay=new URL('https://inkrush-mu.vercel.app/api/mangadex-image');relay.searchParams.set('url',path);
      const response=await this.fetcher(relay,{redirect:'manual',signal:AbortSignal.timeout(25000)}),type=response.headers.get('Content-Type')||'';
      if(!response.ok||!/^image\/(?:jpeg|jpg|png|webp|avif)(?:;|$)/i.test(type)||Number(response.headers.get('Content-Length')||0)>8*1024*1024){await response.body?.cancel();return new Response('Original cover unavailable',{status:502});}
      return new Response(response.body,{headers:{'Content-Type':type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
    }catch{return new Response('Original cover unavailable',{status:502});}
  }
}
export const coverImages=new CoverImages();
