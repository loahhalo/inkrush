import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'INKRUSH — One more page.',description:'Discover manga, manhwa and manhua. Read English and Indonesian chapters in one place.'};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#101114'};
// Runs synchronously before the body. The server and first client render share the same shell.
const themeScript=`(()=>{let t='dark';try{const saved=localStorage.getItem('inkrush:theme');if(saved==='light'||saved==='dark')t=saved;else if(saved==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}catch{}const r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;r.style.setProperty('--bg',t==='dark'?'#101114':'#f6f5f2');r.style.setProperty('--fg',t==='dark'?'#f4f3ef':'#1a1b1e');r.style.backgroundColor=t==='dark'?'#101114':'#f6f5f2';r.dataset.startView=location.hash.includes('read')?'read':location.hash.includes('title/')?'title':'catalog';})();`;
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}</body></html>;}
