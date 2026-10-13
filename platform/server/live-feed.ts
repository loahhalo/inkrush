type Entry<T>={value:T;at:number;retryAt:number;failed:boolean};
export class LiveFeedCache<T> {
  private entries=new Map<string,Entry<T>>();private pending=new Map<string,Promise<T>>();
  constructor(privateOptions:{ttlMs?:number;maxEntries?:number;now?:()=>number}={}){this.ttl=privateOptions.ttlMs??60000;this.limit=privateOptions.maxEntries??32;this.now=privateOptions.now??Date.now;}
  private ttl:number;private limit:number;private now:()=>number;
  private refresh(key:string,loader:()=>Promise<T>){const existing=this.pending.get(key);if(existing)return existing;const promise=Promise.resolve().then(loader).then(value=>{if(this.entries.size>=this.limit&&!this.entries.has(key))this.entries.delete(this.entries.keys().next().value!);this.entries.delete(key);this.entries.set(key,{value,at:this.now(),retryAt:0,failed:false});return value;}).catch(error=>{const old=this.entries.get(key);if(old){old.failed=true;old.retryAt=this.now()+this.ttl;}throw error;}).finally(()=>this.pending.delete(key));this.pending.set(key,promise);return promise;}
  async read(key:string,loader:()=>Promise<T>){let entry=this.entries.get(key);if(!entry){await this.refresh(key,loader);entry=this.entries.get(key)!;}const age=this.now()-entry.at;let refreshing=this.pending.has(key);if(age>=this.ttl&&this.now()>=entry.retryAt){void this.refresh(key,loader).catch(()=>{});refreshing=true;}return {value:entry.value,updatedAt:new Date(entry.at).toISOString(),refreshing,stale:entry.failed||age>2*this.ttl,refreshAfter:this.ttl/1000};}
}
