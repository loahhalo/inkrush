import {clamp} from './core.js';

export function bookmarkIndex(story, mark={}) {
  const id=mark.chapterId||story.legacyOrder?.[mark.chapter];
  const index=id?story.chapters.findIndex(c=>c.id===id||c.alternativeIds?.includes(id)):-1;
  return index>=0?index:clamp(Number.isInteger(mark.chapter)?mark.chapter:0,0,story.chapters.length-1);
}
export function chapterRows(chapters, query='', order='desc') {
  const q=query.trim().toLowerCase().replace(/^(?:ch(?:apter)?\.?\s*)/, '');
  const numeric=/^\d+(?:\.\d+)?$/.test(q);
  const rows=chapters.map((chapter,index)=>({chapter,index})).filter(({chapter:c})=>!q||(numeric?c.chapterNumber!=null&&Number(c.chapterNumber)===Number(q):String(c.chapterNumber??'special').toLowerCase().includes(q)||c.name.toLowerCase().includes(q)));
  if(order==='date')rows.sort((a,b)=>String(b.chapter.publishedAt||'').localeCompare(String(a.chapter.publishedAt||''))||b.index-a.index);
  else if(order==='desc')rows.reverse();
  return rows;
}
export function comicType(language) {
  return language==='ko'?'Manhwa':language==='zh'||language==='zh-hk'?'Manhua':language==='ja'?'Manga':'Comic';
}
export function chapterLabel(chapter) {
  return chapter.chapterNumber==null?'Special':`Chapter ${chapter.chapterNumber}`;
}
export function latestChapterIndex(chapters) {
  for(let i=chapters.length-1;i>=0;i--)if(chapters[i].chapterNumber!=null)return i;
  return chapters.length-1;
}
