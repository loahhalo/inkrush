const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const allowed = new RegExp(`^/(?:manga(?:/${uuid}(?:/feed)?)?|at-home/server/${uuid})$`,'i');
export async function proxyMangaDex(request, pathParts) {
  if(request.method!=='GET')return Response.json({error:'Only GET requests are supported.'},{status:405});
  const path='/'+pathParts.join('/');
  if(!allowed.test(path))return Response.json({error:'Unknown comic API endpoint.'},{status:404});
  const incoming=new URL(request.url), target=new URL('https://api.mangadex.org'+path);
  for(const [key,value]of incoming.searchParams){if(key.length>80||value.length>250)return Response.json({error:'Invalid query.'},{status:400});target.searchParams.append(key,value);}
  try {
    const response=await fetch(target,{headers:{'Accept':'application/json','User-Agent':'INKRUSH/1.0 (comic reader)'},signal:AbortSignal.timeout(20000)});
    if(!response.ok)return Response.json({error:response.status===429?'The comic source is busy. Please try again shortly.':`The comic source returned ${response.status}.`},{status:response.status===429?429:502});
    const data=await response.json();
    return Response.json(data,{headers:{'Cache-Control':path.startsWith('/at-home/')?'public, max-age=60':'public, max-age=120'}});
  }catch{return Response.json({error:'The comic source is temporarily unavailable. Please try again.'},{status:502});}
}
