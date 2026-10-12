import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuwayomiClient} from '../lib/suwayomi-config.mjs';
import {handleGatewayImage} from '../lib/gateway.mjs';

test('Local HTTP requires explicit local mode, exact loopback IP, and a non-Vercel process',()=>{
  assert.equal(createSuwayomiClient({}),null);
  assert.equal(createSuwayomiClient({INKRUSH_LOCAL:'1',SUWAYOMI_URL:'http://127.0.0.1:4567'}).base,'http://127.0.0.1:4567');
  for(const env of [
    {SUWAYOMI_URL:'http://127.0.0.1:4567'},
    {INKRUSH_LOCAL:'1',VERCEL:'1',SUWAYOMI_URL:'http://127.0.0.1:4567'},
    ...['http://localhost:4567','http://127.0.0.1.evil.test','http://192.168.1.3','https://user:pass@server.test','https://server.test/path','https://server.test/?token=x'].map(SUWAYOMI_URL=>({INKRUSH_LOCAL:'1',SUWAYOMI_URL}))
  ])assert.throws(()=>createSuwayomiClient(env));
});

test('Basic authentication reaches GraphQL; incomplete and conflicting credentials are rejected',async()=>{
  const env={SUWAYOMI_URL:'https://server.test',SUWAYOMI_USERNAME:'reader',SUWAYOMI_PASSWORD:'private'};
  const client=createSuwayomiClient(env),original=globalThis.fetch;
  try{globalThis.fetch=async(url,options)=>{assert.equal(url,'https://server.test/api/graphql');assert.equal(options.headers.Authorization,'Basic '+Buffer.from('reader:private').toString('base64'));assert.equal(options.redirect,'error');return Response.json({data:{ok:true}});};assert.deepEqual(await client.request('query{ok}'),{ok:true});}finally{globalThis.fetch=original;}
  for(const extra of [{SUWAYOMI_PASSWORD:''},{SUWAYOMI_TOKEN:'token'},{SUWAYOMI_USERNAME:'reader:extra'}])assert.throws(()=>createSuwayomiClient({...env,...extra}));
  assert.equal(createSuwayomiClient({SUWAYOMI_URL:'https://server.test',SUWAYOMI_TOKEN:'token'}).authorization,'Bearer token');
});

test('Suwayomi images use the same Basic header without putting credentials in URLs',async()=>{
  const keys=['SUWAYOMI_URL','SUWAYOMI_USERNAME','SUWAYOMI_PASSWORD','SUWAYOMI_TOKEN'],before=Object.fromEntries(keys.map(k=>[k,process.env[k]])),original=globalThis.fetch;
  try{Object.assign(process.env,{SUWAYOMI_URL:'https://server.test',SUWAYOMI_USERNAME:'reader',SUWAYOMI_PASSWORD:'private'});delete process.env.SUWAYOMI_TOKEN;
    globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://server.test/api/v1/manga/1/thumbnail');assert.equal(options.headers.Authorization,'Basic '+Buffer.from('reader:private').toString('base64'));assert.equal(options.redirect,'manual');return new Response(new Uint8Array([1]),{headers:{'Content-Type':'image/png'}});};
    const response=await handleGatewayImage(new Request('https://reader.test/api/gateway-image?path=/api/v1/manga/1/thumbnail'));assert.equal(response.status,200);
  }finally{globalThis.fetch=original;for(const key of keys)if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}
});
