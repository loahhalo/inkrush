import {CONSENT_KEY} from './measurement.ts';
export type AnalyticsConsent='yes'|'no'|null;
export function parseConsent(value:string|null):AnalyticsConsent{return value==='yes'||value==='no'?value:null;}
export function watchConsent(target:Pick<Window,'addEventListener'|'removeEventListener'>,changed:(value:AnalyticsConsent)=>void){const sync=(event:StorageEvent)=>{if(event.key===CONSENT_KEY||event.key===null)changed(parseConsent(event.newValue));};target.addEventListener('storage',sync as EventListener);return ()=>target.removeEventListener('storage',sync as EventListener);}
