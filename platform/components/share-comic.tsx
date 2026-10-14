'use client';
import {useState} from 'react';
import {comicPath,SITE_URL} from '../shared/seo.ts';
export default function ShareComic({comic}:{comic:{id:string;title:string}}){const [message,setMessage]=useState('');async function share(){const url=SITE_URL+comicPath(comic);try{if(navigator.share){await navigator.share({title:comic.title+' | INKRUSH',text:'Your next story: '+comic.title,url});return;}await navigator.clipboard.writeText(url);setMessage('Link copied');}catch(error){if(error instanceof Error&&error.name==='AbortError')return;setMessage('Copy this link: '+url);}}return <div className="share-comic"><button className="secondary" onClick={()=>void share()}>Share story</button>{message?<p role="status">{message}</p>:null}</div>;}
