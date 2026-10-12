import test from 'node:test';
import assert from 'node:assert/strict';
import {centralId,parseCentralCatalog,parseCentralChapters,parseCentralPages,handleCentral,proxyCentralImage} from '../lib/weebcentral.mjs';
const id='01J76XYCPSY3C4BNPBRY8JMCBE',one='01J76XYXYZGGRVGEGATYQWFTD8',two='01J76XZ666GREP4DQDKEP1YDZG';
test('English source cards keep stable IDs and actual Manhwa type',()=>{
 const card=`<a href="https://weebcentral.com/series/${id}/Solo-Leveling"><picture><img src="https://temp.compsci88.com/cover/fallback/${id}.jpg" alt="Solo Leveling cover"></picture><span data-tip="Manhwa"></span></a>`;const result=parseCentralCatalog(card+card);assert.equal(result.length,1);assert.equal(result[0].title,'Solo Leveling');assert.equal(result[0].format,'Manhwa');assert.equal(result[0].id,'wc:'+id);
});
test('Chapter source order reverses without losing zero or decimal chapters',()=>{
 const row=(id,name)=>`<a href="/chapters/${id}"><span class="grow"><span class="">${name}</span></span><time datetime="2024-09-07T17:04:15.717Z"></time></a>`;const chapters=parseCentralChapters(row(two,'Chapter 1.5')+row(one,'Chapter 0'));assert.deepEqual(chapters.map(c=>c.chapterNumber),['0','1.5']);assert.equal(chapters[0].id,'wc:'+one);
});
test('Only real reader images pass the CDN restrictions',async()=>{
 const html='<img src="https://hot.planeptune.us/manga/Solo-Leveling/0000-001.png" alt="Page 1"><img src="https://evil.test/page.png" alt="Page 2"><img src="https://hot.planeptune.us/manga/Solo-Leveling/logo.png" alt="Logo">';assert.equal(parseCentralPages(html).length,1);
 for(const url of ['https://hot.planeptune.us.evil.test/manga/A/1.png','https://user:secret@hot.planeptune.us/manga/A/1.png','https://localhost/manga/A/1.png'])assert.equal((await proxyCentralImage(new Request('https://reader.test/api/central-image?url='+encodeURIComponent(url)))).status,400);
});
test('Source API validates IDs and fixed actions before making any request',async()=>{
 assert.equal(centralId('wc:'+id),id);for(const value of ['../../admin','https://evil.test','01;DROP'])assert.throws(()=>centralId(value));assert.equal((await handleCentral(new Request('https://reader.test/api/central?action=manga&id=bad'))).status,400);assert.equal((await handleCentral(new Request('https://reader.test/api/central?action=admin'))).status,400);
});
