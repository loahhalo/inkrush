'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import PagedImage from './paged-image.tsx';
import type {Page} from '../server/types.ts';
type Frame={page:Page;alt:string;segment:number};
type Props=Frame & {zoom:number;onZoom:(value:number)=>void;onSwipe:(dx:number,dy:number)=>void;onSegments:(total:number)=>void;onReady:()=>void};
const ignore=()=>{};

// Keep the committed layer mounted while the next image loads and decodes.
// Stable source keys let the decoded layer become visible without remounting it.
export default function PageStage(props:Props){
  const target:Frame={page:props.page,alt:props.alt,segment:props.segment},latest=useRef(target);
  const [shown,setShown]=useState<Frame|null>(null),[failed,setFailed]=useState('');
  useLayoutEffect(()=>{latest.current=target;if(shown?.page.src===target.page.src&&(shown.segment!==target.segment||shown.alt!==target.alt))setShown(target);},[target.page.src,target.segment,target.alt,shown]);
  const previous=shown&&shown.page.src!==target.page.src?shown:null,frames=previous?[previous,target]:[target];
  return <div className="page-stage">
    {!shown&&failed!==target.page.src?<span className="page-spinner" role="status" aria-label="Loading chapter"/>:null}
    {frames.map(frame=>{const isTarget=frame.page.src===target.page.src,pending=isTarget&&shown?.page.src!==target.page.src,hasError=pending&&failed===frame.page.src;return <div key={frame.page.src} className={'page-layer'+(pending?' pending':'')+(hasError?' failed':'')} aria-hidden={pending&&!hasError} data-page-layer={pending?'pending':'visible'}>
      <PagedImage {...frame} zoom={props.zoom} onZoom={props.onZoom} onSwipe={props.onSwipe} onSegments={isTarget?props.onSegments:ignore} onReady={()=>{if(latest.current.page.src!==frame.page.src)return;setShown(latest.current);setFailed('');props.onReady();}} onFailed={()=>{if(latest.current.page.src===frame.page.src)setFailed(frame.page.src);}} onRetry={()=>setFailed('')}/>
    </div>;})}
  </div>;
}
