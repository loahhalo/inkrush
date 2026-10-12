import {aggregator,findChapter} from '../../../server/aggregator.ts';
import {unseal} from '../../../server/identity.ts';
import type {ProviderRef} from '../../../server/types.ts';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(request:Request){const p=new URL(request.url).searchParams;const action=p.get('action')||'catalog';const language=p.get('language')==='id'?'id':'en';try{let result;
  if(action==='catalog'){const page=Number(p.get('page')||1),q=(p.get('q')||'').trim(),category=p.get('category')||'trending';if(!Number.isInteger(page)||page<1||page>100||q.length>150||!['trending','popular','new','latest'].includes(category))return Response.json({error:'Invalid search'},{status:400});result=await aggregator.catalog({q,page,language,category,type:p.get('type')||undefined});}
  else if(action==='detail'){const comic=await aggregator.detail(p.get('id')||'',language),legacyChapter=p.get('legacyChapter');const resumeChapterId=findChapter(comic.chapters,p.get('chapter')||undefined)?.id||(legacyChapter?comic.chapters.find(c=>unseal<{refs:ProviderRef[]}>('c',c.id).refs.some(r=>r.provider_internal_id===legacyChapter))?.id:undefined);result=resumeChapterId?{...comic,resumeChapterId}:comic;}
  else if(action==='pages')result=await aggregator.pages(p.get('id')||'',p.get('release')||undefined);
  else return Response.json({error:'Unknown request'},{status:400});
  return Response.json(result,{headers:{'Cache-Control':'private, max-age=60'}});
}catch(error){console.error('Library request failed',action,error instanceof Error?error.message:'unavailable');return Response.json({error:action==='catalog'?'Stories are temporarily unavailable. Please retry.':action==='detail'?'This title is temporarily unavailable. Please retry.':'This chapter could not load. Try another release or retry.'},{status:502});}}
