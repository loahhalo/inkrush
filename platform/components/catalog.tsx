'use client';
import {useEffect,useRef,useState} from 'react';
import {rankSuggestions} from '../../public/search.js';
import {matchesPreferences,comicType,type ContentPreferences} from '../shared/content.ts';
import type {Catalog as CatalogData,Comic,Language} from '../server/types.ts';
import {api,ComicCard,ErrorMessage,GridSkeleton,Icon,readStore,relativeDate} from './shared.tsx';
const categories=[['trending','Trending'],['latest','Latest updates'],['new','New'],['popular','Popular']];
export default function Catalog({language,setLanguage,preferences}:{language:Language;setLanguage:(lang:Language)=>void;preferences:ContentPreferences}){
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[category,setCategory]=useState('trending'),[type,setType]=useState(''),[page,setPage]=useState(1),[data,setData]=useState<CatalogData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[history,setHistory]=useState<Comic[]>([]),[focused,setFocused]=useState(false),[active,setActive]=useState(-1),[visible,setVisible]=useState(30),[refreshing,setRefreshing]=useState(false),[refreshError,setRefreshError]=useState('');
  const results=useRef<HTMLDivElement>(null),refreshNow=useRef<()=>void>(()=>{}),version=useRef(0),preferenceKey=JSON.stringify(preferences);
  useEffect(()=>{setHistory(readStore<Comic[]>('history',[]));},[]);
  useEffect(()=>{const timer=setTimeout(()=>{setSearch(query.trim());setPage(1);},320);return ()=>clearTimeout(timer);},[query]);
  useEffect(()=>{
    const controller=new AbortController(),requestVersion=++version.current;setLoading(true);setError('');setRefreshError('');setVisible(30);
    api<CatalogData>('catalog',{q:search,language,category,page,preferences:preferenceKey,...(type?{type}:{})},controller.signal).then(next=>{if(controller.signal.aborted||requestVersion!==version.current)return;setData(old=>page>1&&old?{...next,comics:[...new Map([...old.comics,...next.comics].map(c=>[c.id,c])).values()]}:next);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[search,language,category,type,preferenceKey,page,revision]);
  useEffect(()=>{
    if(loading||error)return;const controller=new AbortController(),requestVersion=version.current;let busy=false,lastAttempt=0,followup:ReturnType<typeof setTimeout>|undefined,attempts=0;
    async function refresh(manual=false){
      if(controller.signal.aborted||busy||document.visibilityState==='hidden'||navigator.onLine===false||!manual&&Date.now()-lastAttempt<4000)return;
      busy=true;lastAttempt=Date.now();setRefreshing(true);setRefreshError('');
      try{const next=await api<CatalogData>('catalog',{q:search,language,category,page:1,preferences:preferenceKey,...(type?{type}:{})},controller.signal);if(controller.signal.aborted||requestVersion!==version.current)return;
        setData(old=>page>1&&old?{...next,comics:[...next.comics,...old.comics.filter(c=>!next.comics.some(n=>n.id===c.id))],hasNextPage:old.hasNextPage}:next);
        if(next.refreshing&&attempts++<6)followup=setTimeout(()=>{void refresh();},5000);else attempts=0;
      }catch{if(!controller.signal.aborted)setRefreshError('Couldn’t refresh right now. Your last feed is still available.');}
      finally{busy=false;if(!controller.signal.aborted)setRefreshing(false);}
    }
    refreshNow.current=()=>{attempts=0;void refresh(true);};if(data?.refreshing)followup=setTimeout(()=>{void refresh();},5000);const timer=setInterval(()=>{attempts=0;void refresh();},60000);
    const resume=()=>{if(Date.now()-lastAttempt>15000)void refresh();};document.addEventListener('visibilitychange',resume);window.addEventListener('focus',resume);window.addEventListener('online',resume);
    return ()=>{controller.abort();clearInterval(timer);clearTimeout(followup);document.removeEventListener('visibilitychange',resume);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);refreshNow.current=()=>{};};
  },[page,loading,error,search,language,category,type,preferenceKey]);
  const typeName=({ja:'Manga',ko:'Manhwa',zh:'Manhua',other:'Other'} as Record<string,string>)[type];
  const candidates=[...history,...data?.comics||[]].filter(c=>c.language===language&&matchesPreferences(c,preferences)&&(!typeName||comicType(c.format)===typeName));
  const suggestions:Comic[]=query.trim()?rankSuggestions(candidates,query,history.map((h:Comic & {visits?:number;at?:number})=>({...h,source:h.language,visits:h.visits||1,at:h.at||0})),language):candidates.filter(c=>history.some(h=>h.id===c.id)).slice(0,5);
  function choose(comic:Comic){location.hash='title/'+encodeURIComponent(comic.id);setFocused(false);}
  function reset(){setQuery('');setType('');setPage(1);setCategory('trending');}
  return <section aria-label="Discover comics">
    <div className="discover-heading"><span className="eyebrow">YOUR NEXT OBSESSION</span><h1>Find a story.<br/><span>Fall into it.</span></h1><p>A world of stories, one more chapter away.</p></div>
    <div className="search-area"><form className="search-box" onSubmit={e=>{e.preventDefault();setSearch(query.trim());setPage(1);setFocused(false);}}><Icon name="search"/><input type="search" placeholder="Search manga, manhwa, manhua…" aria-label="Search comics" role="combobox" aria-autocomplete="list" aria-expanded={focused&&suggestions.length>0} aria-controls="search-suggestions" aria-activedescendant={active>=0?'suggestion-'+active:undefined} value={query} maxLength={150} onChange={e=>{setQuery(e.target.value);setActive(-1);}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onKeyDown={e=>{if(e.key==='Escape')setFocused(false);if(['ArrowDown','ArrowUp'].includes(e.key)&&suggestions.length){e.preventDefault();setActive(i=>(i+(e.key==='ArrowDown'?1:-1)+suggestions.length)%suggestions.length);}if(e.key==='Enter'&&active>=0&&focused&&suggestions[active]){e.preventDefault();choose(suggestions[active]);}}}/>{query?<button type="button" onClick={()=>setQuery('')} aria-label="Clear search"><Icon name="close"/></button>:<kbd>/</kbd>}</form>{focused&&suggestions.length?<div className="suggestions" id="search-suggestions" role="listbox" aria-label="Suggested stories">{suggestions.map((c,i)=><div key={c.id} id={'suggestion-'+i} role="option" aria-selected={i===active} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(c)}><span>{c.title}</span><small>{history.some(h=>h.id===c.id)?'Recently opened':c.format}</small></div>)}</div>:null}</div>
    <div className="catalog-toolbar"><div className="category-tabs" aria-label="Discover categories">{categories.map(([value,label])=><button key={value} aria-pressed={category===value} onClick={()=>{setCategory(value);setPage(1);}}>{label}</button>)}</div><div className="catalog-filters"><select aria-label="Reading language" value={language} onChange={e=>{setLanguage(e.target.value as Language);setPage(1);}}><option value="en">English</option><option value="id">Bahasa Indonesia</option></select><select aria-label="Comic type" value={type} onChange={e=>{setType(e.target.value);setPage(1);}}><option value="">All stories</option><option value="ja">Manga</option><option value="ko">Manhwa</option><option value="zh">Manhua</option><option value="other">Other / Webtoons</option></select><a className="filter-preferences" href="#preferences"><Icon name="settings"/><span>Preferences</span></a>{query||type?<button className="quiet" onClick={reset}>Reset</button>:null}</div></div>
    <div ref={results} aria-live="polite"><div className="results-heading"><h2>{search?'Results for “'+search+'”':categories.find(c=>c[0]===category)?.[1]}</h2><span>{loading?'Finding your next read…':data?.comics.length+' stories'}</span></div>
      {!loading&&data?<div className="feed-freshness"><span className={'live-dot'+(data.stale?' stale':'')}/><span>{refreshing||data.refreshing?'Updating…':data.stale?'Showing the last available feed':data.updatedAt?<time dateTime={data.updatedAt}>{'Updated '+(Date.now()-Date.parse(data.updatedAt)<60000?'just now':relativeDate(data.updatedAt))}</time>:'Live feed'}<span className="feed-cadence"> · Auto-refresh every minute</span></span><button className="icon-button" aria-label="Refresh stories" title="Refresh stories" disabled={refreshing} onClick={()=>refreshNow.current()}><Icon name="refresh"/></button></div>:null}
      {refreshError?<p className="subtle-note" role="status">{refreshError}</p>:null}
      {error?<ErrorMessage message={error} retry={()=>setRevision(n=>n+1)}/>:loading&&page===1?<GridSkeleton/>:data?.comics.length?<div className="comic-grid">{data.comics.slice(0,visible).map(c=><ComicCard key={c.id} comic={c}/>)}</div>:<div className="empty-state"><h2>No stories found.</h2><p>Try another title, language or content preference.</p><div className="empty-actions"><button className="secondary" onClick={reset}>Reset filters</button><a className="secondary" href="#preferences">Content preferences</a></div></div>}
      {data?.partial&&!loading&&!error?<p className="subtle-note">Some stories are temporarily unavailable. We’ll check again automatically.</p>:null}
      {data&&(data.hasNextPage||visible<data.comics.length)&&!error?<button className="secondary load-more" disabled={loading} onClick={()=>visible<data!.comics.length?setVisible(n=>n+30):setPage(n=>n+1)}>{loading?'Loading…':'Load more'}</button>:null}
    </div>
  </section>;
}
