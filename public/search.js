export const searchText = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function near(a,b) {
  if(Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,edits=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}
  return edits+(a.length-i)+(b.length-j)<=1;
}
export function rankSuggestions(items,query,history=[],source='',now=Date.now()) {
  const q=searchText(query),seen=new Set();
  if(!q)return [];
  return items.filter(m=>m?.id&&m?.title&&!seen.has(String(m.id))&&seen.add(String(m.id))).map(m=>{
    let relevance=0;
    for(const title of [m.title,...(m.altTitles||[])]){const t=searchText(title),words=t.split(' ');relevance=Math.max(relevance,t===q?100:t.startsWith(q)?80:t.includes(q)?60:words.some(w=>w.startsWith(q))?50:q.length>=4&&words.some(w=>near(w,q))?25:0);}
    const h=history.find(h=>h.id===m.id&&h.source===source);
    const affinity=h?Math.min(10,Math.log2(1+h.visits)*3)+Math.max(0,5-(now-h.at)/86400000):0;
    return {...m,score:relevance?relevance+affinity:0,familiar:!!h};
  }).filter(m=>m.score>0).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,6);
}
export function rememberTitle(history,manga,source,now=Date.now()) {
  const prior=history.find(h=>h.id===manga.id&&h.source===source);
  return [{id:manga.id,title:manga.title,altTitles:manga.altTitles||[],source,visits:(prior?.visits||0)+1,at:now},...history.filter(h=>h.id!==manga.id||h.source!==source)].slice(0,60);
}
