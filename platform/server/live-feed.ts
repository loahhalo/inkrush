import {DISCOVERY_REFRESH_MS} from '../shared/discovery.ts';
type Entry<T>={value:T;at:number;retryAt:number;failed:boolean};
export class LiveFeedCache<T> {
  private entries=new Map<string,Entry<T>>();private pending=new Map<string,Promise<T>>();
  constructor(privateOptions:{ttlMs?:number;maxEntries?:number;now?:()=>number}={}){this.ttl=privateOptions.ttlMs??DISCOVERY_REFRESH_MS;this.limit=privateOptions.maxEntries??32;this.now=privateOptions.now??Date.now;}
  private ttl:number;private limit:number;private now:()=>number;
  private refresh(key:string,loader:()=>Promise<T>){const existing=this.pending.get(key);if(existing)return existing;const promise=Promise.resolve().then(loader).then(value=>{if(this.entries.size>=this.limit&&!this.entries.has(key))this.entries.delete(this.entries.keys().next().value!);this.entries.delete(key);this.entries.set(key,{value,at:this.now(),retryAt:0,failed:false});return value;}).catch(error=>{const old=this.entries.get(key);if(old){old.failed=true;old.retryAt=this.now()+this.ttl;}throw error;}).finally(()=>this.pending.delete(key));this.pending.set(key,promise);return promise;}
  async read(key:string,loader:()=>Promise<T>,waitForFresh=false){let entry=this.entries.get(key);if(!entry){await this.refresh(key,loader);entry=this.entries.get(key)!;}if(this.now()-entry.at>=this.ttl&&this.now()>=entry.retryAt){const refresh=this.refresh(key,loader);if(waitForFresh){try{await refresh;}catch{}entry=this.entries.get(key)!;}else void refresh.catch(()=>{});}const age=this.now()-entry.at;return {value:entry.value,updatedAt:new Date(entry.at).toISOString(),refreshing:this.pending.has(key),stale:entry.failed||age>2*this.ttl,refreshAfter:this.ttl/1000};}
}
