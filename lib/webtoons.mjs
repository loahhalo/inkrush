const origin='https://www.webtoons.com';
const cache=new Map();
class InputError extends Error {}
export function textContent(value='') {
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',hellip:'…',ndash:'–',mdash:'—'};
  return value.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(entity,key)=>{if(key[0]!=='#')return named[key]??entity;const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/\s+/g,' ').trim();
}
function attribute(tag,name){return textContent(tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i'))?.[1]||'');}
function classText(html,name){return textContent(html.match(new RegExp('<([a-z][a-z0-9]*)\\b[^>]*class=["\'][^"\']*\\b'+name+'\\b[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/\\1>','i'))?.[2]||'');}
function meta(html,name){for(const tag of html.match(/<meta\b[^>]*>/gi)||[])if(attribute(tag,'property')===name)return attribute(tag,'content');return '';}
export function webtoonPath(value,viewer=false){
  let url;try{url=new URL(String(value).replace(/^wt:/,''),origin);}catch{throw new InputError('Invalid WEBTOON title.');}
  const pattern=viewer?/^\/en\/[a-z0-9_-]+\/[a-z0-9_-]+\/[a-z0-9_-]+\/viewer$/:/^\/en\/[a-z0-9_-]+\/[a-z0-9_-]+\/list$/;
  if(url.origin!==origin||url.username||url.password||url.port||!pattern.test(url.pathname)||!/^\d{1,10}$/.test(url.searchParams.get('title_no')||'')||(viewer&&!/^\d{1,10}$/.test(url.searchParams.get('episode_no')||'')))throw new InputError('Unknown WEBTOON page.');
  return url.pathname+'?title_no='+url.searchParams.get('title_no')+(viewer?'&episode_no='+url.searchParams.get('episode_no'):'');
}
export function webtoonImageAllowed(url){return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&['webtoon-phinf.pstatic.net','swebtoon-phinf.pstatic.net'].includes(url.hostname)&&/^\/\d{8}_\d+\/[^/]+\/[^/]+\.(?:jpe?g|png|webp|gif)$/i.test(url.pathname);}
const image=value=>{try{const url=new URL(value);return webtoonImageAllowed(url)?'/api/webtoon-image?url='+encodeURIComponent(url.href):'';}catch{return '';}};

export function parseWebtoonCatalog(html){
  const result=new Map();
  for(const anchor of html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi)||[]){
    const title=classText(anchor,'title');if(!title||/data-title-unsuitable-for-children=["']true["']/i.test(anchor))continue;
    let path;try{path=webtoonPath(attribute(anchor,'href'));}catch{continue;}
    const poster=image(attribute(anchor.match(/<img\b[^>]*>/i)?.[0]||'','src'));
    result.set(path,{id:'wt:'+path,title,author:classText(anchor,'author'),genre:[classText(anchor,'genre')].filter(Boolean),poster,format:'Webtoon',sourceLabel:'WEBTOON · ENGLISH',sourceUrl:origin+path,newRelease:/class=["'][^"']*badge_new/.test(anchor)});
  }
  return [...result.values()];
}
export function parseWebtoonDetails(html,id){
  const path=webtoonPath(id),title=classText(html,'subj')||meta(html,'og:title').replace(/\s*\|\s*WEBTOON.*$/i,'');
  if(!title)throw new Error('WEBTOON could not return this title.');
  const schedule=classText(html,'day_info');
  return {id:'wt:'+path,title,description:classText(html,'summary'),author:classText(html,'author_area'),genre:[classText(html,'genre')].filter(Boolean),poster:image(meta(html,'og:image')),status:/COMPLETED|END/i.test(schedule)?'completed':/EVERY/i.test(schedule)?'ongoing':undefined,format:'Webtoon',sourceLabel:'WEBTOON · ENGLISH',sourceUrl:origin+path};
}
export function normalizeWebtoonEpisodes(episodes){
  const unique=new Map();
  for(const episode of episodes||[]){let path;try{path=webtoonPath(episode.viewerLink,true);}catch{continue;}
    const number=textContent(episode.episodeTitle).match(/(?:episode|ep\.?)\s*(\d+(?:\.\d+)?)/i)?.[1];
    const date=new Date(episode.exposureDateMillis);if(Number.isNaN(+date)||+date>Date.now())continue;
    const name=textContent(episode.episodeTitle),special=/bonus|epilogue|announcement|hiatus|special/i.test(name);
    unique.set(path,{id:'wt:'+path,chapterNumber:number??(special?null:String(episode.episodeNo)),name,publishedAt:date.toISOString(),sequence:Number(episode.episodeNo)});
  }
  return [...unique.values()].sort((a,b)=>a.sequence-b.sequence);
}
export function parseWebtoonPages(html){
  const section=html.match(/<div\b[^>]*id=["']_imageList["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]||'';
  return [...new Set((section.match(/<img\b[^>]*>/gi)||[]).map(tag=>image(attribute(tag,'data-url'))).filter(Boolean))];
}
async function get(url,json=false){
  const key=url.href||String(url),cached=cache.get(key);if(cached&&Date.now()-cached.at<120000)return cached.data;
  const response=await fetch(url,{redirect:'manual',headers:{'Accept':json?'application/json':'text/html','Accept-Language':'en','Referer':origin+'/','User-Agent':'INKRUSH/1.0'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(response.status===429?'WEBTOON is busy. Please retry shortly.':'WEBTOON is temporarily unavailable. Please retry.');
  const body=await response.text();if(body.length>4000000)throw new Error('The source response was too large.');const data=json?JSON.parse(body):body;
  if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),data});return data;
}
export async function handleWebtoons(request){
  if(request.method!=='GET')return Response.json({error:'Only GET requests are supported.'},{status:405});
  const url=new URL(request.url),action=url.searchParams.get('action')||'catalog';
  try{let result;
    if(action==='catalog'){
      const category=url.searchParams.get('category')||'trending',query=(url.searchParams.get('q')||'').trim(),page=Number(url.searchParams.get('page')||1);
      if(!['trending','popular','new','latest'].includes(category)||!Number.isInteger(page)||page<1||page>100||query.length>150)throw new InputError('Invalid catalog request.');
      const upstream=new URL(query?'/en/search':category==='popular'?'/en/ranking/popular':category==='trending'?'/en/ranking/trending':'/en/originals',origin);
      if(query)upstream.searchParams.set('keyword',query);else if(['new','latest'].includes(category))upstream.searchParams.set('sortOrder','UPDATE');
      let titles=parseWebtoonCatalog(await get(upstream));if(category==='new'&&!query)titles=titles.filter(m=>m.newRelease);
      const offset=(page-1)*18;result={mangas:titles.slice(offset,offset+18),hasNextPage:offset+18<titles.length};
    }else if(action==='manga'){
      const path=webtoonPath(url.searchParams.get('id')),titleId=new URL(path,origin).searchParams.get('title_no'),type=path.startsWith('/en/canvas/')?'canvas':'webtoon';
      const episodeUrl=new URL(`https://m.webtoons.com/api/v1/${type}/${titleId}/episodes`);episodeUrl.searchParams.set('pageSize','99999');if(type==='canvas')episodeUrl.searchParams.set('readingLanguageCode','en');
      const [html,data]=await Promise.all([get(new URL(path,origin)),get(episodeUrl,true)]);const story=parseWebtoonDetails(html,path),chapters=normalizeWebtoonEpisodes(data.result?.episodeList);
      if(!chapters.length)return Response.json({error:'This title has no public English episodes on WEBTOON.',sourceUrl:story.sourceUrl,code:'NO_PUBLIC_EPISODES'},{status:404});
      result={...story,chapters};
    }else if(action==='pages'){
      const path=webtoonPath(url.searchParams.get('id'),true),pages=parseWebtoonPages(await get(new URL(path,origin)));
      if(!pages.length)return Response.json({error:'This episode requires reading on WEBTOON. Choose another public episode, or open it on WEBTOON.',sourceUrl:origin+path,code:'PROVIDER_READER_REQUIRED'},{status:404});
      result={pages};
    }else throw new InputError('Unknown WEBTOON action.');
    return Response.json(result,{headers:{'Cache-Control':'public, max-age=120'}});
  }catch(error){return Response.json({error:error instanceof InputError?error.message:'WEBTOON could not load this request. Please retry.'},{status:error instanceof InputError?400:502});}
}
export async function proxyWebtoonImage(request){
  if(request.method!=='GET')return new Response('Only GET requests are supported',{status:405});
  let target;try{target=new URL(new URL(request.url).searchParams.get('url'));}catch{return new Response('Invalid image URL',{status:400});}
  if(!webtoonImageAllowed(target))return new Response('Unknown image source',{status:400});
  try{const response=await fetch(target,{redirect:'manual',headers:{Referer:origin+'/','User-Agent':'INKRUSH/1.0'},signal:AbortSignal.timeout(25000)});
    if(!response.ok||!response.headers.get('Content-Type')?.startsWith('image/'))return new Response('Image unavailable',{status:502});
    return new Response(response.body,{headers:{'Content-Type':response.headers.get('Content-Type'),'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response('Image unavailable',{status:502});}
}
