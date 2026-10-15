import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {adReady} from '../platform/shared/measurement.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const local=path.join(root,'.runtime/deploy-tools/railway/railway.exe'),cli=existsSync(local)?local:'railway';
const flags=['--service','reader','--environment','production'];
try{const action=process.argv[2]||'status';if(!['on','off','status'].includes(action))throw Error('Use on, off or status');const variables=JSON.parse(execFileSync(cli,['variable','list',...flags,'--json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));if(action==='on'&&!adReady({...variables,INKRUSH_ADS_ENABLED:'true'}))throw Error('Ads stay OFF. First configure INKRUSH_ADS_CLIENT (ca-pub-...), INKRUSH_ADS_SLOT, INKRUSH_ADS_APPROVED=true and INKRUSH_ADS_CMP_READY=true after actual approval and consent setup. Never mark these ready to bypass provider requirements.');if(action!=='status'){execFileSync(cli,['variable','set',...flags,'INKRUSH_ADS_ENABLED='+String(action==='on')],{cwd:root,stdio:['ignore','pipe','pipe']});console.log(action==='on'?'Advertising enabled. Railway will deploy the updated setting.':'Advertising disabled. Railway will deploy the updated setting.');}else console.log(adReady(variables)?'Advertising enabled.':'Advertising OFF or not configured.');}catch(error){console.error(error instanceof Error?error.message:'Could not update advertising');process.exitCode=1;}
