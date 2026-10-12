import {ExtensionClient} from '../public/api.js';

export function createSuwayomiClient(env=process.env){
  if(!env.SUWAYOMI_URL)return null;
  const url=new URL(env.SUWAYOMI_URL);
  const local=env.INKRUSH_LOCAL==='1'&&!env.VERCEL&&url.protocol==='http:'&&['127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!local)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Suwayomi requires an HTTPS origin; local mode permits an explicit loopback HTTP origin only.');
  const username=env.SUWAYOMI_USERNAME||'',password=env.SUWAYOMI_PASSWORD||'',token=env.SUWAYOMI_TOKEN||'';
  if(Boolean(username)!==Boolean(password)||username.includes(':')||/[\r\n]/.test(username+password+token))throw new Error('Suwayomi authentication is incomplete or invalid.');
  if(token&&username)throw new Error('Choose either Suwayomi Basic authentication or a Bearer token.');
  const client=new ExtensionClient(url.origin,token);
  client.authorization=username?'Basic '+Buffer.from(username+':'+password).toString('base64'):token?'Bearer '+token:'';
  return client;
}
