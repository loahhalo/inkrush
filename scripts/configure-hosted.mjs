import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
if(!process.env.VERCEL)throw new Error('This build configuration is only for Vercel.');
await fs.writeFile(path.join(root,'public','source-config.js'),'// This provider rejects the hosted runtime.\nexport const CENTRAL_ENABLED=false;\n');
console.log('Hosted reader configured; additional sources use the server gateway.');
