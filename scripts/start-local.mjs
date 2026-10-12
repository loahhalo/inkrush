import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import net from 'node:net';

const root=path.resolve(import.meta.dirname,'..');
const runtime=path.join(root,'.runtime','suwayomi');
const portable=path.join(runtime,'portable','Suwayomi-Server-v2.4.2366-windows-x64');
const java=path.join(portable,'jre','bin','java.exe');
const jar=path.join(portable,'bin','Suwayomi-Server.jar');
const data=path.join(runtime,'data');
const port=Number(process.env.INKRUSH_PORT||8082);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local reader port.');
for(const candidate of [4567,port])await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(new Error(`Port ${candidate} is occupied. Use the running local reader or stop it first.`)));probe.listen(candidate,'127.0.0.1',()=>probe.close(resolve));});
await fs.access(java).catch(()=>{throw new Error('Portable Suwayomi is missing. Run scripts/setup-suwayomi.ps1 first.');});
await fs.mkdir(data,{recursive:true});
const configuration=`server.ip = "127.0.0.1"
server.port = 4567
server.initialOpenInBrowserEnabled = false
server.systemTrayEnabled = false
server.kcefEnabled = false
server.webUIChannel = "BUNDLED"
server.webUIUpdateCheckInterval = 0
server.globalUpdateInterval = 0
server.autoDownloadNewChapters = false
server.extensionStores = ["https://github.com/keiyoushi/extensions/raw/repo/index.pb"]
`;
try{await fs.writeFile(path.join(data,'server.conf'),configuration,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
const children=[];
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(0),1500).unref();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
function launch(command,args,logName,env=process.env){
  return fs.open(path.join(runtime,logName),'a').then(log=>{
    const child=spawn(command,args,{cwd:root,env,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
    children.push(child);child.on('error',error=>console.error(error.message));log.close().catch(()=>{});return child;
  });
}
async function healthy(url){try{return (await fetch(url,{signal:AbortSignal.timeout(1500)})).ok;}catch{return false;}}
await launch(java,['-Xmx1024m',`-Dsuwayomi.tachidesk.config.server.rootDir=${data.replaceAll('\\','/')}`,'-Dsuwayomi.tachidesk.config.server.ip=127.0.0.1','-Dsuwayomi.tachidesk.config.server.initialOpenInBrowserEnabled=false','-Dsuwayomi.tachidesk.config.server.systemTrayEnabled=false','--add-exports=java.desktop/sun.awt=ALL-UNNAMED','-jar',jar],'server.log');
console.log('Starting Suwayomi; first startup can take a minute. Logs: .runtime/suwayomi/server.log');
let ready=false;
for(let i=0;i<90;i++){
  try{const r=await fetch('http://127.0.0.1:4567/api/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query { sources(first:1){nodes{id}} }'}),signal:AbortSignal.timeout(2000)});const j=await r.json();if(j.data){ready=true;break;}}catch{}
  if(children[0].exitCode!==null)break;
  await delay(1000);
}
if(!ready){for(const child of children)child.kill();throw new Error('Suwayomi did not start. See .runtime/suwayomi/server.log.');}
await launch(process.execPath,[path.join(root,'scripts','serve-local.mjs')],'reader.log',{...process.env,INKRUSH_LOCAL:'1',INKRUSH_PORT:String(port),SUWAYOMI_URL:'http://127.0.0.1:4567'});
let readerReady=false;
for(let i=0;i<20;i++){
  if(await healthy(`http://127.0.0.1:${port}/api/gateway?action=sources`)){readerReady=true;break;}
  if(children[1].exitCode!==null)break;
  await delay(500);
}
if(!readerReady){for(const child of children)child.kill();throw new Error('The reader did not start. See .runtime/suwayomi/reader.log.');}
console.log(`INKRUSH: http://127.0.0.1:${port}/reader#discover\nSuwayomi: http://127.0.0.1:4567\nKeep this terminal running. Ctrl+C stops this local test.`);
await fs.writeFile(path.join(runtime,'session.json'),JSON.stringify({startedAt:new Date().toISOString(),supervisor:process.pid,children:children.map(c=>c.pid),reader:`http://127.0.0.1:${port}/reader#discover`,data},null,2));
for(const child of children)child.on('exit',()=>{if(!stopping){console.error('A local service stopped. Check the log files.');stop();}});
