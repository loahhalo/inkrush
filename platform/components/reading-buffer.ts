type Connection={saveData?:boolean;effectiveType?:string};
export function lookAhead(connection?:Connection){return connection?.saveData||/^(slow-)?2g$/.test(connection?.effectiveType||'')?0:connection?.effectiveType==='3g'?1:3;}
export function bufferPlan(total:number,current:number,ahead:number){const result:number[]=[];for(let i=1;i<=ahead&&current+i<total;i++)result.push(current+i);if(ahead&&current>0)result.push(current-1);return result;}
export class ChapterPageCache<T> {
  private entries=new Map<string,{expires:number;value:Promise<T>}>();
  constructor(privateLimit=8,privateTtl=180000,privateNow:()=>number=Date.now){this.limit=privateLimit;this.ttl=privateTtl;this.now=privateNow;}
  private limit:number;private ttl:number;private now:()=>number;
  load(key:string,loader:()=>Promise<T>,refresh=false):Promise<T>{const entry=this.entries.get(key);if(!refresh&&entry&&entry.expires>this.now()){this.entries.delete(key);this.entries.set(key,entry);return entry.value;}
    this.entries.delete(key);while(this.entries.size>=this.limit)this.entries.delete(this.entries.keys().next().value!);
    const item={expires:this.now()+this.ttl,value:Promise.resolve().then(loader)};this.entries.set(key,item);
    void item.value.catch(()=>{if(this.entries.get(key)===item)this.entries.delete(key);});return item.value;
  }
}
