'use client';
import {useEffect,useRef} from 'react';
import {bufferPlan,lookAhead,ChapterPageCache} from './reading-buffer.ts';
import {api} from './shared.tsx';
import type {Page} from '../server/types.ts';
type PagesResult={pages:Page[];releaseId:string;fallbackUsed:boolean};
type NetworkNavigator=Navigator & {connection?:{saveData?:boolean;effectiveType?:string}};
const chapters=new ChapterPageCache<PagesResult>();
export function readChapterPages(id:string,release='',refresh=false){return chapters.load(JSON.stringify([id,release]),()=>api<PagesResult>('pages',{id,...(release?{release}:{})}),refresh);}
export function preloadDistance(){return typeof navigator==='undefined'?0:lookAhead((navigator as NetworkNavigator).connection);}

export function usePageBuffer(pages:Page[],current:number,ready:boolean,enabled:boolean){
  const retained=useRef(new Map<string,HTMLImageElement>());
  useEffect(()=>{
    if(!enabled||!ready)return;const ahead=preloadDistance(),targets=bufferPlan(pages.length,current,ahead).map(i=>pages[i].src),keep=new Set([pages[current]?.src,...targets]);
    for(const [src,img]of retained.current)if(!keep.has(src)){img.onload=null;img.onerror=null;if(!img.complete)img.src='';retained.current.delete(src);}
    if(!ahead)return;let stopped=false,active=0;const queue=targets.filter(src=>!retained.current.has(src));
    function pump(){while(!stopped&&active<2&&queue.length){const src=queue.shift()!,img=new Image();active++;retained.current.set(src,img);img.fetchPriority='low';img.decoding='async';
      const finish=()=>{img.onload=null;img.onerror=null;active--;if(!img.naturalWidth)retained.current.delete(src);else if(src===targets[0]&&img.naturalWidth*img.naturalHeight<=2_000_000)void img.decode().catch(()=>{});pump();};img.onload=finish;img.onerror=finish;img.src=src;
    }}pump();return ()=>{stopped=true;};
  },[pages,current,ready,enabled]);
  useEffect(()=>()=>{for(const img of retained.current.values()){img.onload=null;img.onerror=null;if(!img.complete)img.src='';}retained.current.clear();},[]);
}
