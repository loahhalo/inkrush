import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(await fs.realpath(new URL('../platform/node_modules/next/package.json',import.meta.url)));
const sharp=require('sharp');
const output=new URL('../platform/public/icons/',import.meta.url);
await fs.mkdir(output,{recursive:true});
// Reuse the existing orange, italic "ir" brand mark. Keep artwork inside the maskable safe area.
function icon(maskable=false){return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="${maskable?0:100}" fill="#101114"/><rect x="${maskable?106:70}" y="${maskable?106:70}" width="${maskable?300:372}" height="${maskable?300:372}" rx="76" fill="#f59c64"/><g fill="#101114" transform="translate(0 5) skewX(-9)"><path d="M190 208h48l-15 140h-48zm7-66h48l-5 42h-48zM257 208h47l-3 27c17-24 37-31 63-29l-5 47c-38-4-59 12-62 43l-6 52h-48z"/></g></svg>`;}
for(const [name,size,maskable] of [['icon-192.png',192,false],['icon-512.png',512,false],['maskable-512.png',512,true],['apple-touch-icon.png',180,false]])await sharp(Buffer.from(icon(maskable))).resize(size,size).png().toFile(new URL(name,output).pathname.replace(/^\/([A-Z]:)/,'$1'));
console.log('Generated four INKRUSH app icons.');
