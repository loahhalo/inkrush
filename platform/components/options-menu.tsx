'use client';
import {useEffect,useRef,useState} from 'react';
import {Icon} from './shared.tsx';
export default function OptionsMenu({changeTheme}:{changeTheme:()=>void}){const [open,setOpen]=useState(false),host=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!open)return;function close(e:PointerEvent){if(!host.current?.contains(e.target as Node))setOpen(false);}function key(e:KeyboardEvent){if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}}document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);};},[open]);
  return <div ref={host} className="options-menu" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}><button ref={trigger} className="icon-button" aria-label="Options" aria-expanded={open} aria-controls="app-options" onClick={()=>setOpen(v=>!v)}><Icon name="settings"/></button>{open?<div id="app-options" className="options-popover"><a href="/guides" onClick={()=>setOpen(false)}><Icon name="book"/>Reading guides</a><a href="#preferences" onClick={()=>setOpen(false)}><Icon name="settings"/>Content preferences</a><button onClick={()=>{changeTheme();setOpen(false);}}><Icon name="sun"/>Change appearance</button></div>:null}</div>;
}
