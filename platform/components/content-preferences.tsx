'use client';
import {RATINGS,TYPES,DEMOGRAPHICS,GENRES,THEMES,defaultPreferences,type ContentPreferences} from '../shared/content.ts';
import {Icon} from './shared.tsx';
type Props={value:ContentPreferences;onChange:(next:ContentPreferences)=>void};
export default function ContentPreferencesPage({value,onChange}:Props){
  function toggle(key:keyof ContentPreferences,item:string){const list=value[key] as string[];onChange({...value,[key]:list.includes(item)?list.filter(v=>v!==item):[...list,item]});}
  const sections:{key:keyof ContentPreferences;title:string;hint:string;options:readonly (readonly [string,string])[];blocked?:boolean}[]=[
    {key:'ratings',title:'Content rating',hint:'Choose the maturity ratings you want to see.',options:RATINGS},
    {key:'types',title:'Type',hint:'Choose which stories appear in Discover.',options:TYPES.map(type=>[type,type] as const)},
    {key:'demographics',title:'Demographic',hint:'Choose the intended audiences you want to see.',options:DEMOGRAPHICS},
    {key:'blockedGenres',title:'Blocked genres',hint:'Checked genres stay out of your feed.',options:GENRES.map(tag=>[tag,tag] as const),blocked:true},
    {key:'blockedThemes',title:'Blocked themes',hint:'Checked themes stay out of your feed.',options:THEMES.map(tag=>[tag,tag] as const),blocked:true}
  ];
  return <section className="preferences-page" aria-label="Content preferences"><a href="#discover" className="back-link"><Icon name="left"/>Discover</a><div className="preferences-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h1>Content preferences<span>.</span></h1><p>A feed shaped around the stories you want to read.</p></div><button className="secondary" onClick={()=>onChange(defaultPreferences())}>Reset defaults</button></div><p className="preferences-save" role="status"><Icon name="check"/>Saved automatically on this device.</p>{sections.map(section=><fieldset key={section.key} className={'preference-card'+(section.blocked?' blocked':'')}><legend>{section.title}</legend><p>{section.hint}</p><div className={'preference-options'+(section.blocked?' tags':'')}>{section.options.map(([key,label])=><label key={key}><input type="checkbox" checked={(value[section.key] as string[]).includes(key)} onChange={()=>toggle(section.key,key)}/><span>{label}</span></label>)}</div></fieldset>)}<p className="preferences-note">Unrated and unspecified titles have incomplete metadata. Turn those options off for stricter filtering. Other includes webtoons, other formats and titles whose format is not provided. Preferences filter Discover and suggestions; your saved library stays available.</p><a href="#discover" className="primary">Back to Discover<Icon name="right"/></a></section>;
}
