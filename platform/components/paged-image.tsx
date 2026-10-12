'use client';
import {useEffect,useRef,useState} from 'react';
import {stripMetrics} from '../../public/strip.js';
import type {Page} from '../server/types.ts';

export default function PagedImage({page,alt,segment,onSegments}:{page:Page;alt:string;segment:number;onSegments:(total:number)=>void}){
  const host=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null),report=useRef(onSegments);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0),[metrics,setMetrics]=useState({total:1,step:0,maxOffset:0});
  useEffect(()=>{report.current=onSegments;},[onSegments]);
  useEffect(()=>{
    const node=host.current,img=image.current;if(!node||!img)return;
    function measure(){if(!img?.naturalWidth||!node)return;const next=stripMetrics(img.naturalWidth,img.naturalHeight,node.clientWidth,node.clientHeight);setMetrics(next);report.current(next.total);}
    img.addEventListener('load',measure);if(img.complete)measure();
    const observer=new ResizeObserver(measure);observer.observe(node);
    return ()=>{img.removeEventListener('load',measure);observer.disconnect();};
  },[attempt]);
  const slice=Math.min(segment,metrics.total-1),offset=Math.min(slice*metrics.step,metrics.maxOffset);
  return <div ref={host} className={'paged-image '+(metrics.total>1?'segmented ':'')+state}>
    {state==='loading'?<span className="page-spinner" role="status" aria-label="Loading page"/>:null}
    {state==='error'?<button className="image-retry" onClick={()=>{setState('loading');setAttempt(n=>n+1);}}>Tap to retry</button>:null}
    <img ref={image} key={attempt} src={page.src+(attempt?'&retry='+attempt:'')} alt={alt} draggable={false} decoding="async" onLoad={()=>setState('ready')} onError={()=>setState('error')} style={{opacity:state==='ready'?1:0,transform:metrics.total>1?`translateY(-${offset}px)`:undefined}}/>
  </div>;
}
