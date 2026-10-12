import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.join(root,'outputs','inkrush-vercel');
await fs.mkdir(destination,{recursive:true});
await fs.cp(path.join(root,'public'),path.join(destination,'public'),{recursive:true});
await fs.writeFile(path.join(destination,'public','source-config.js'),'// This source returns HTTP 403 to the hosted reader.\nexport const CENTRAL_ENABLED=false;\n');
// Older packages may still contain the retired feature. Remove only these known files.
for(const file of ['music.js','music.css','mood.js','chapter-analysis.js'])await fs.rm(path.join(destination,'public',file),{force:true});
await fs.mkdir(path.join(destination,'lib'),{recursive:true});
await fs.mkdir(path.join(destination,'api'),{recursive:true});
for(const file of ['mangadex-proxy.mjs','mangadex-image.mjs','webtoons.mjs','cache.mjs','ranking.mjs','trending.mjs','gateway.mjs','suwayomi-config.mjs'])await fs.copyFile(path.join(root,'lib',file),path.join(destination,'lib',file));
await fs.cp(path.join(root,'lib','data'),path.join(destination,'lib','data'),{recursive:true});
for(const [name,handler,mod]of [['gateway','handleGateway','gateway'],['gateway-image','handleGatewayImage','gateway'],['trending','handleTrending','trending'],['trending-sync','handleTrendingSync','trending']])await fs.writeFile(path.join(destination,'api',name+'.js'),`import {${handler}} from '../lib/${mod}.mjs';\nexport default {fetch(request){return ${handler}(request);}};\n`);
for(const file of ['api/central.js','api/central-image.js','lib/weebcentral.mjs'])await fs.rm(path.join(destination,file),{force:true});
await fs.writeFile(path.join(destination,'api','webtoons.js'),`import {handleWebtoons} from '../lib/webtoons.mjs';\nexport default {fetch(request){return handleWebtoons(request);}};\n`);
await fs.writeFile(path.join(destination,'api','webtoon-image.js'),`import {proxyWebtoonImage} from '../lib/webtoons.mjs';\nexport default {fetch(request){return proxyWebtoonImage(request);}};\n`);
await fs.writeFile(path.join(destination,'api','comics.js'),`import {proxyMangaDex} from '../lib/mangadex-proxy.mjs';
export default {
  fetch(request) {
    const url=new URL(request.url);
    const route=url.searchParams.get('path')||'';
    url.searchParams.delete('path');
    return proxyMangaDex(new Request(url,request),route.split('/').filter(Boolean));
  }
};
`);
await fs.writeFile(path.join(destination,'api','mangadex-image.js'),`import {proxyImage} from '../lib/mangadex-image.mjs';
export default {fetch(request){return proxyImage(request);}};
`);
await fs.writeFile(path.join(destination,'package.json'),JSON.stringify({name:'inkrush',version:'1.0.0',private:true,type:'module',engines:{node:'24.x'}},null,2)+'\n');
await fs.writeFile(path.join(destination,'vercel.json'),JSON.stringify({
  $schema:'https://openapi.vercel.sh/vercel.json',version:2,framework:null,
  buildCommand:'',installCommand:'',outputDirectory:'public',cleanUrls:true,
  rewrites:[{source:'/',destination:'/reader'},{source:'/api/mangadex/:path*',destination:'/api/comics?path=:path*'}],
  functions:{'api/*.js':{maxDuration:60,includeFiles:'lib/data/**'}},
  crons:[{path:'/api/trending-sync',schedule:'0 3 * * *'}]
},null,2)+'\n');
await fs.writeFile(path.join(destination,'README.md'),'# INKRUSH on Vercel\n\nDeploy this directory as a Vercel project with Framework Preset Other. The public directory contains the reader and assets. The api directory provides Node.js 24 functions for WEBTOON and MangaDex metadata and images. Weeb Central is disabled here after returning HTTP 403 from Vercel; its adapter remains available in the maintained local reader. Solo Leveling has a clearly labelled official English publisher link on the hosted app. The retired soundtrack and its archive are excluded. No keys are required for the deployed baseline. Configure UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN and CRON_SECRET for durable daily trending sync. Optional SUWAYOMI_URL plus SUWAYOMI_USERNAME/SUWAYOMI_PASSWORD (native Basic), or SUWAYOMI_TOKEN (Bearer proxy), enable hosted Indonesian extensions. See the maintained docs/ARCHITECTURE.md. Reader progress and adaptive search history stay in browser storage and start fresh on a new domain.\n\nRegenerate this package from the maintained reader checkout with node scripts/prepare-vercel.mjs.\n');
await fs.mkdir(path.join(destination,'docs'),{recursive:true});
for(const file of ['ARCHITECTURE.md','SOURCE-EVALUATION.md','LOCAL-SUWAYOMI.md'])await fs.copyFile(path.join(root,'docs',file),path.join(destination,'docs',file));
await fs.copyFile(path.join(root,'ASSETS.md'),path.join(destination,'ASSETS.md'));
console.log(destination);
