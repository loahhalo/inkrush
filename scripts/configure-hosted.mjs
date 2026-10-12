import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
if(!process.env.VERCEL&&process.env.INKRUSH_HOSTED!=='1')throw new Error('This build configuration is only for hosted builds.');
await fs.writeFile(path.join(root,'public','source-config.js'),'// This provider rejects the hosted runtime.\nexport const CENTRAL_ENABLED=false;\n');
console.log('Hosted reader configured; additional sources use the server gateway.');
