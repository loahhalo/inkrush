import type {Catalog} from '../server/types.ts';
type Entry={at:number;value:Catalog;persist:boolean};
type Store=Pick<Storage,'getItem'|'setItem'>;
// Bounded, device-local snapshots. Preference/language/type are part of the key;
// stale data never crosses filters, and a failed network refresh keeps usable cards.
export class CatalogSnapshots {
  private entries=new Map<string,Entry>();private loaded=false;
  private storage:()=>Store|undefined;private now:()=>number;
  constructor(storage:()=>Store|undefined=()=>typeof window==='undefined'?undefined:window.sessionStorage,now:()=>number=Date.now){this.storage=storage;this.now=now;}
  private load(){if(this.loaded)return;this.loaded=true;try{const rows=JSON.parse(this.storage()?.getItem('inkrush:catalog:v2')||'[]');if(Array.isArray(rows))for(const row of rows.slice(-8))if(Array.isArray(row)&&typeof row[0]==='string'&&typeof row[1]?.at==='number'&&Array.isArray(row[1]?.value?.comics))this.entries.set(row[0],{...row[1],persist:true});}catch{}}
  get(key:string){this.load();const entry=this.entries.get(key);if(!entry)return null;if(this.now()-entry.at>1800000||this.now()<entry.at){this.entries.delete(key);return null;}this.entries.delete(key);this.entries.set(key,entry);return entry.value;}
  set(key:string,value:Catalog,persist=true){this.load();this.entries.delete(key);this.entries.set(key,{at:this.now(),value,persist});while(this.entries.size>8)this.entries.delete(this.entries.keys().next().value!);if(persist)try{this.storage()?.setItem('inkrush:catalog:v2',JSON.stringify([...this.entries].filter(([,entry])=>entry.persist)));}catch{}}
}
export const catalogSnapshots=new CatalogSnapshots();
