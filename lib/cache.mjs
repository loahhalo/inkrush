// Durable REST Redis is optional; deployed baseline snapshots work without credentials.
export class Cache {
  constructor(env=process.env,fetcher=fetch){this.url=env.UPSTASH_REDIS_REST_URL;this.token=env.UPSTASH_REDIS_REST_TOKEN;this.fetcher=fetcher;this.memory=new Map();this.pending=new Map();}
  get durable(){return !!(this.url&&this.token);}
  async command(args){const response=await this.fetcher(this.url,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error('Cache unavailable');const data=await response.json();if(data.error)throw new Error('Cache command failed');return data.result;}
  async get(key){if(this.durable){const value=await this.command(['GET','inkrush:'+key]);return value?JSON.parse(value):null;}const item=this.memory.get(key);if(item&&item.expires>Date.now())return item.value;this.memory.delete(key);return null;}
  async set(key,value,ttl=86400){if(this.durable)return this.command(['SET','inkrush:'+key,JSON.stringify(value),'EX',ttl]);if(this.memory.size>=100)this.memory.delete(this.memory.keys().next().value);this.memory.set(key,{value,expires:Date.now()+ttl*1000});}
  async remember(key,ttl,loader){let cached;try{cached=await this.get(key);}catch{}if(cached)return cached;if(this.pending.has(key))return this.pending.get(key);const promise=(async()=>{const value=await loader();try{await this.set(key,value,ttl);}catch{}return value;})().finally(()=>this.pending.delete(key));this.pending.set(key,promise);return promise;}
}
export const cache=new Cache();
