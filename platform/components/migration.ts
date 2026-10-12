import {api,readStore,writeStore} from './shared.tsx';
import type {Comic,ComicDetail} from '../server/types.ts';
type OldComic={id:string;title:string;demo?:boolean};
const shelf=(c:ComicDetail):Comic=>({id:c.id,title:c.title,author:c.author,description:c.description,genre:c.genre,cover:c.cover,language:c.language,format:c.format,status:c.status});
// Existing per-origin data is retained; migrate with two requests at a time, never block Discover.
export async function migrateShelf(update:(comics:Comic[])=>void,signal:AbortSignal){if(readStore('legacyMigrated',false))return;let old:OldComic[]=[];try{old=JSON.parse(localStorage.getItem('inkrush:library')||'[]');}catch{}if(!Array.isArray(old))return;const pending=old.filter(c=>c.id&&!c.demo).slice(0,50);let failed=false;
  async function worker(){while(pending.length&&!signal.aborted){const next=pending.shift();if(!next)break;try{const comic=await api<ComicDetail>('detail',{id:next.id,language:next.id.startsWith('md:id:')?'id':'en'},signal);if(signal.aborted)return;const current=readStore<Comic[]>('library',[]);if(!current.some(c=>c.id===comic.id)){const updated=[...current,shelf(comic)];writeStore('library',updated);update(updated);}}catch{failed=true;}}}
  await Promise.all([worker(),worker()]);if(!failed&&!signal.aborted)writeStore('legacyMigrated',true);
}
export function legacyPosition(){try{const last=JSON.parse(localStorage.getItem('inkrush:lastManga')||'null');if(!last?.id)return null;const bookmarks=JSON.parse(localStorage.getItem('inkrush:bookmarks')||'{}');const entry=Object.entries(bookmarks).find(([key])=>key.endsWith(':'+last.id));const mark=(entry?.[1]||{}) as {chapterId?:string;page?:number};return {id:last.id,chapterId:mark.chapterId||'',page:mark.page||0};}catch{return null;}}
