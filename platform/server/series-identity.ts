import type {InternalManga} from './types.ts';
export function titleKey(title:string){return title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
export function ambiguousTitle(m:Pick<InternalManga,'title'|'altTitles'>){return [m.title,...m.altTitles||[]].some(t=>/^wind\s*breaker(?:\s*\([^)]*\))?$/i.test(t.trim()));}
export function seriesIdentity(m:InternalManga){if(!ambiguousTitle(m))return '';const text=[m.title,m.author,m.description,...m.altTitles||[]].join(' ');if(/nii\s*satoru|satoru\s*nii|haruka\s*sakura|furin\s*high|bofurin/i.test(text))return 'wind-breaker-japan';if(/yong\s*seok\s*jo|jo\s*yong\s*seok|yongseok|jay\s*jo|hummingbird\s*crew|cycling|bicycl/i.test(text))return 'wind-breaker-korea';return '';}
function origin(m:InternalManga){if(m.originalLanguage)return m.originalLanguage.split('-')[0];const f=m.format?.toLowerCase();return f==='manga'?'ja':f==='manhwa'?'ko':f==='manhua'?'zh':'';}
export function matchesSeries(a:InternalManga,b:InternalManga){if(a.language!==b.language)return false;const ai=seriesIdentity(a),bi=seriesIdentity(b);if(ambiguousTitle(a)||ambiguousTitle(b)){return !!ai&&ai===bi;}
  const ao=origin(a),bo=origin(b);if(ao&&bo&&ao!==bo)return false;
  const keys=new Set([a.title,...a.altTitles||[]].map(titleKey).filter(Boolean));return [b.title,...b.altTitles||[]].some(t=>keys.has(titleKey(t)));}
