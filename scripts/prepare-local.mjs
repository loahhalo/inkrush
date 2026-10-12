import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const destination=path.join(root,'outputs','inkrush-local');
await fs.mkdir(destination,{recursive:true});
for(const directory of ['public','docs'])await fs.cp(path.join(root,directory),path.join(destination,directory),{recursive:true});
await fs.mkdir(path.join(destination,'lib'),{recursive:true});
for(const file of ['mangadex-proxy.mjs','mangadex-image.mjs','webtoons.mjs','weebcentral.mjs','cache.mjs','ranking.mjs','trending.mjs','gateway.mjs','suwayomi-config.mjs'])await fs.copyFile(path.join(root,'lib',file),path.join(destination,'lib',file));
await fs.cp(path.join(root,'lib','data'),path.join(destination,'lib','data'),{recursive:true});
for(const file of ['connector-context.ts','connector-contract.mts','connector-errors.mts','connector-preview.d.ts','connectors.ts','utils.ts'])await fs.rm(path.join(destination,'lib',file),{force:true});
for(const file of ['music.js','music.css','mood.js','chapter-analysis.js'])await fs.rm(path.join(destination,'public',file),{force:true});
await fs.mkdir(path.join(destination,'scripts'),{recursive:true});
for(const file of ['serve-local.mjs','setup-suwayomi.ps1','start-local.mjs','start-local.ps1'])await fs.copyFile(path.join(root,'scripts',file),path.join(destination,'scripts',file));
for(const file of ['Start INKRUSH.cmd','ASSETS.md'])await fs.copyFile(path.join(root,file),path.join(destination,file));
// Retire the old entry point in earlier packages to avoid starting an outdated gateway.
await fs.rm(path.join(destination,'server.mjs'),{force:true});
await fs.writeFile(path.join(destination,'package.json'),JSON.stringify({name:'inkrush-local',private:true,type:'module',engines:{node:'>=22.13.0'},scripts:{start:'node scripts/start-local.mjs'}},null,2)+'\n');
await fs.writeFile(path.join(destination,'README.md'),'# INKRUSH local reader\n\nOn Windows x64 with Node.js 22.13+, double-click Start INKRUSH.cmd. The first run downloads the pinned official portable Suwayomi release and verifies its checksum. Open http://127.0.0.1:8082/reader#discover and keep the launcher running. No dependency install, Docker, or hosting account is required.\n\nThis package excludes the local database, installed extensions, caches, credentials, and server binaries. On a new computer install the desired Keiyoushi extensions through http://127.0.0.1:4567 before selecting them in INKRUSH. See docs/LOCAL-SUWAYOMI.md for setup, verified source coverage and the future Railway migration. The public Vercel app cannot reach this loopback-only backend.\n');
console.log(destination);
