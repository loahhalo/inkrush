'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {stripMetrics} from '../../public/strip.js';
import {clampPan,pinchZoom,type Point} from './reader-display.ts';
import type {Page} from '../server/types.ts';

export default function PagedImage({page,alt,segment,onSegments,zoom,onZoom,onSwipe,onReady,onFailed,onRetry}:{onReady:()=>void;onFailed?:()=>void;onRetry?:()=>void;page:Page;alt:string;segment:number;onSegments:(total:number)=>void;zoom:number;onZoom:(value:number)=>void;onSwipe:(dx:number,dy:number)=>void}){
  const host=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null),report=useRef(onSegments);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0),[metrics,setMetrics]=useState({total:1,step:0,maxOffset:0}),[pan,setPan]=useState<Point>({x:0,y:0});
  const currentPan=useRef(pan),pointers=useRef(new Map<number,Point>()),start=useRef<Point|null>(null),startPan=useRef<Point>({x:0,y:0}),pinch=useRef({distance:0,zoom:1,used:false}),pointerType=useRef('mouse'),tap=useRef<{time:number;point:Point}|null>(null);
  useEffect(()=>{report.current=onSegments;},[onSegments]);
  function bounded(point:Point){const node=host.current,img=image.current;return node&&img?clampPan(point,zoom,node.clientWidth,node.clientHeight,img.naturalWidth,img.naturalHeight,metrics.total>1):{x:0,y:0};}
  function movePan(point:Point){const next=bounded(point);currentPan.current=next;setPan(next);}
  useLayoutEffect(()=>{movePan(currentPan.current);},[zoom,metrics,segment]);
  useEffect(()=>{
    const node=host.current,img=image.current;if(!node||!img)return;
    function measure(){if(!img?.naturalWidth||!node)return;const next=stripMetrics(img.naturalWidth,img.naturalHeight,node.clientWidth,node.clientHeight);setMetrics(next);report.current(next.total);}
    img.addEventListener('load',measure);if(img.complete)measure();
    const observer=new ResizeObserver(measure);observer.observe(node);
    return ()=>{img.removeEventListener('load',measure);observer.disconnect();};
  },[attempt]);
  function distance(){const [a,b]=[...pointers.current.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
  async function loaded(){const img=image.current;if(!img)return;try{await img.decode();}catch{if(!img.naturalWidth)return;}if(image.current!==img||!img.isConnected)return;setState('ready');onReady();}
  function down(e:ReactPointerEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest('button')||e.pointerType==='mouse'&&e.button!==0||pointers.current.size>=2)return;
    pointerType.current=e.pointerType;host.current?.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===1){start.current={x:e.clientX,y:e.clientY};startPan.current=currentPan.current;pinch.current={distance:0,zoom,used:false};}
    else{pinch.current={distance:distance(),zoom,used:true};tap.current=null;}
  }
  function move(e:ReactPointerEvent<HTMLDivElement>){
    if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===2){onZoom(pinchZoom(pinch.current.zoom,pinch.current.distance,distance()));return;}
    if(zoom>1&&start.current)movePan({x:startPan.current.x+e.clientX-start.current.x,y:startPan.current.y+e.clientY-start.current.y});
  }
  function up(e:ReactPointerEvent<HTMLDivElement>){
    if(!pointers.current.has(e.pointerId))return;
    const origin=start.current,wasPinch=pinch.current.used;pointers.current.delete(e.pointerId);
    if(!pointers.current.size&&origin&&!wasPinch){const dx=e.clientX-origin.x,dy=e.clientY-origin.y;
      if(Math.hypot(dx,dy)<12&&e.pointerType==='touch'){
        const now=Date.now(),last=tap.current;if(last&&now-last.time<320&&Math.hypot(e.clientX-last.point.x,e.clientY-last.point.y)<28){onZoom(zoom>1?1:2);tap.current=null;}else tap.current={time:now,point:{x:e.clientX,y:e.clientY}};
      }else{tap.current=null;if(zoom===1)onSwipe(dx,dy);}
    }
    if(pointers.current.size===1){start.current=[...pointers.current.values()][0];startPan.current=currentPan.current;}
    else if(!pointers.current.size)start.current=null;
  }
  const slice=Math.min(segment,metrics.total-1),offset=Math.min(slice*metrics.step,metrics.maxOffset);
  return <div ref={host} className={'paged-image '+(metrics.total>1?'segmented ':'')+state+(zoom>1?' zoomed':'')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{pointers.current.clear();start.current=null;tap.current=null;}} onDoubleClick={()=>{if(pointerType.current==='mouse')onZoom(zoom>1?1:2);}}>
    {state==='error'?<button className="image-retry" onClick={()=>{onRetry?.();setState('loading');setAttempt(n=>n+1);}}>Tap to retry</button>:null}
    <div className="paged-image-content" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
      <img ref={image} key={attempt} src={page.src+(attempt?'&retry='+attempt:'')} alt={alt} draggable={false} loading="eager" fetchPriority="high" decoding="async" onLoad={loaded} onError={()=>{setState('error');onFailed?.();}} style={{opacity:state==='ready'?1:0,transform:metrics.total>1?`translateY(-${offset}px)`:undefined}}/>
    </div>
  </div>;
}
