'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {enterFullscreen,leaveFullscreen} from './reader-display.ts';

// The document survives chapter navigation, so native fullscreen survives too.
export function useReaderFullscreen(enabled:boolean){
  const [immersive,setImmersive]=useState(false),active=useRef(false),generation=useRef(0),native=useRef(false);
  const exit=useCallback(()=>{generation.current++;active.current=false;setImmersive(false);void leaveFullscreen(document);},[]);
  const toggle=useCallback(()=>{
    if(active.current){exit();return;}
    active.current=true;setImmersive(true);const request=++generation.current;
    // Focus layout is the fallback when this browser cannot enter native fullscreen.
    void enterFullscreen(document).then(entered=>{if(request!==generation.current){if(entered)void leaveFullscreen(document);return;}native.current=entered;});
  },[exit]);
  useEffect(()=>{
    function changed(){if(document.fullscreenElement===document.documentElement){native.current=true;}else if(native.current){native.current=false;active.current=false;setImmersive(false);}}
    document.addEventListener('fullscreenchange',changed);
    return ()=>{document.removeEventListener('fullscreenchange',changed);generation.current++;void leaveFullscreen(document);};
  },[]);
  useEffect(()=>{if(!enabled)exit();},[enabled,exit]);
  useEffect(()=>{
    if(!enabled)return;
    function key(e:KeyboardEvent){if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||(e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog[open]'))return;
      if(e.key.toLowerCase()==='f'){e.preventDefault();toggle();}else if(e.key==='Escape'&&active.current){e.preventDefault();exit();}
    }
    window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);
  },[enabled,toggle,exit]);
  return {immersive,toggleFullscreen:toggle};
}
