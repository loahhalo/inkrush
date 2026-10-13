'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';

export default function CoverImage({src,title,lazy=false,retryable=false}:{src:string;title:string;lazy?:boolean;retryable?:boolean}){
  const [state,setState]=useState<'loading'|'ready'|'error'>(src?'loading':'error'),[attempt,setAttempt]=useState(0);
  useEffect(()=>{if(state!=='error'||attempt!==0||!src)return;const timer=setTimeout(()=>{setAttempt(1);setState('loading');},1500);return ()=>clearTimeout(timer);},[state,attempt,src]);
  const imageSrc=src+(src?(src.includes('?')?'&':'?')+'art=source-v2':'')+(attempt?'&retry='+attempt:'');
  return <div className={'cover-art '+state}>{state==='loading'?<span className="cover-loading shimmer" aria-hidden="true"/>:null}{state==='error'?<span className="cover-placeholder" role="img" aria-label={title+' cover unavailable'}>{title.slice(0,1)}{retryable&&src?<button className="cover-retry" onClick={()=>{setAttempt(n=>n+1);setState('loading');}}>Retry cover</button>:null}</span>:<Image key={imageSrc} src={imageSrc} alt={title} width={300} height={400} sizes={retryable?'(max-width:580px) 105px, 220px':'(max-width:580px) 30vw, (max-width:900px) 22vw, 180px'} quality={75} loading={lazy?'lazy':'eager'} decoding="async" onLoad={()=>setState('ready')} onError={()=>setState('error')} style={{opacity:state==='ready'?1:0}}/>}</div>;
}
