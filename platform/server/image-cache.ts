type Entry={bytes:Uint8Array;type:string;expires:number};
type Options={maxBytes?:number;maxImageBytes?:number;maxPending?:number;ttlMs?:number;now?:()=>number};
const headers=(type:string,state:string)=>({'Content-Type':type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','X-Image-Cache':state});

// Byte-bounded LRU, separate from the metadata cache. Cold images still stream immediately;
// only successfully completed, small image responses are retained. No Redis/blob fees.
export class ImageResponseCache {
  private entries=new Map<string,Entry>();
  private pending=new Map<string,Promise<Entry|null>>();
  private bytes=0;
  private maxBytes:number;private maxImageBytes:number;private maxPending:number;private ttlMs:number;private now:()=>number;
  constructor(options:Options={}){this.maxBytes=options.maxBytes??24*1024*1024;this.maxImageBytes=options.maxImageBytes??4*1024*1024;this.maxPending=options.maxPending??4;this.ttlMs=options.ttlMs??6*60*60*1000;this.now=options.now??Date.now;}
  private get(key:string){const entry=this.entries.get(key);if(!entry)return null;this.entries.delete(key);if(entry.expires<=this.now()){this.bytes-=entry.bytes.byteLength;return null;}this.entries.set(key,entry);return entry;}
  private put(key:string,entry:Entry){if(entry.bytes.byteLength>this.maxBytes)return;const old=this.entries.get(key);if(old){this.bytes-=old.bytes.byteLength;this.entries.delete(key);}while(this.bytes+entry.bytes.byteLength>this.maxBytes){const oldest=this.entries.keys().next().value;if(oldest===undefined)break;this.bytes-=this.entries.get(oldest)!.bytes.byteLength;this.entries.delete(oldest);}this.entries.set(key,entry);this.bytes+=entry.bytes.byteLength;}
  private response(entry:Entry,state:string){return new Response(entry.bytes as BodyInit,{headers:{...headers(entry.type,state),'Content-Length':String(entry.bytes.byteLength)}});}
  async load(key:string,loader:()=>Promise<Response>,bypass=false):Promise<Response>{
    if(bypass)return loader();
    const hit=this.get(key);if(hit)return this.response(hit,'HIT');
    const pending=this.pending.get(key);if(pending){const shared=await pending;if(shared&&shared.expires>this.now())return this.response(shared,'COALESCED');return loader();}
    if(this.pending.size>=this.maxPending)return loader();
    let settle:(entry:Entry|null)=>void=()=>{};
    const completion=new Promise<Entry|null>(resolve=>{settle=resolve;});this.pending.set(key,completion);
    let done=false;const finish=(entry:Entry|null)=>{if(done)return;done=true;if(entry)this.put(key,entry);this.pending.delete(key);settle(entry);};
    try{
      const upstream=await loader(),type=(upstream.headers.get('Content-Type')||'').replace(/^image\/jpg(?=;|$)/i,'image/jpeg');
      const announced=Number(upstream.headers.get('Content-Length')||0);
      if(!upstream.ok||!upstream.body||!/^image\/(?:jpeg|png|webp|gif|avif)(?:;|$)/i.test(type)||announced>this.maxImageBytes){finish(null);return upstream;}
      const reader=upstream.body.getReader();let size=0,chunks:Uint8Array[]=[];
      const body=new ReadableStream<Uint8Array>({
        pull:async controller=>{try{const part=await reader.read();if(part.done){if(!done&&size>0&&(!announced||announced===size)){const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}finish({bytes,type,expires:this.now()+this.ttlMs});}else finish(null);chunks=[];controller.close();return;}
          size+=part.value.byteLength;
          if(!done){if(size<=this.maxImageBytes)chunks.push(part.value.slice());else{chunks=[];finish(null);}}
          controller.enqueue(part.value);
        }catch(error){chunks=[];finish(null);controller.error(error);}},
        cancel:async reason=>{chunks=[];finish(null);await reader.cancel(reason);}
      });
      return new Response(body,{headers:headers(type,'MISS')});
    }catch(error){finish(null);throw error;}
  }
}
export const imageCache=new ImageResponseCache();
