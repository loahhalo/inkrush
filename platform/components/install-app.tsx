'use client';
import {useEffect,useRef,useState} from 'react';
import {Icon} from './shared.tsx';
type InstallPrompt=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function InstallApp(){
  const prompt=useRef<InstallPrompt|null>(null),dialog=useRef<HTMLDialogElement>(null);
  const [installed,setInstalled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{
    const standalone=matchMedia('(display-mode: standalone)');
    const update=()=>setInstalled(standalone.matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
    function available(e:Event){e.preventDefault();prompt.current=e as InstallPrompt;}
    function completed(){prompt.current=null;setInstalled(true);dialog.current?.close();}
    update();standalone.addEventListener('change',update);window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',completed);
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{ /* Browser installation remains available if offline setup fails. */ });
    return ()=>{standalone.removeEventListener('change',update);window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',completed);};
  },[]);
  async function install(){
    const deferred=prompt.current;
    if(!deferred){setMessage('');dialog.current?.showModal();return;}
    setBusy(true);
    try{await deferred.prompt();const choice=await deferred.userChoice;if(choice.outcome==='accepted')setInstalled(true);}
    catch{setMessage('Use your browser menu to install INKRUSH.');dialog.current?.showModal();}
    finally{prompt.current=null;setBusy(false);}
  }
  return <><button className={'install-app'+(installed?' installed':'')} onClick={install} disabled={busy} aria-label="Install INKRUSH app"><Icon name="download"/><span>{busy?'Opening…':'Install app'}</span></button><dialog ref={dialog} className="install-dialog" aria-labelledby="install-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><div className="section-heading"><h2 id="install-title">Take INKRUSH with you.</h2><button className="icon-button" aria-label="Close installation help" onClick={()=>dialog.current?.close()}><Icon name="close"/></button></div><p>On Android, open this site in Chrome or Samsung Internet. Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p>On iPhone, use Safari’s Share menu → <strong>Add to Home Screen</strong>.</p><p className="muted">Your library stays in this browser on this device. Reading new chapters needs an internet connection.</p>{message?<p role="status">{message}</p>:null}<button className="primary" onClick={()=>dialog.current?.close()}>Got it</button></dialog></>;
}
