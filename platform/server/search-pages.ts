import {cache as reactCache} from 'react';
import {Cache} from '../../lib/cache.mjs';
import {aggregator} from './aggregator.ts';
import {unseal} from './identity.ts';
import {defaultPreferences} from '../shared/content.ts';
import type {BrowseCategory} from '../shared/seo.ts';
import type {Catalog,ProviderRef} from './types.ts';
const snapshots=new Cache();
// Share normal discovery caches; no full chapter scans for search-engine visits.
export const searchCatalog=reactCache(async(category:BrowseCategory):Promise<Catalog>=>snapshots.remember('platform:search:catalog:'+category,900,()=>aggregator.catalog({q:'',language:'en',category,page:1,preferences:defaultPreferences()})));
export const searchComic=reactCache(async(id:string)=>{
  if(!/^m_[A-Za-z0-9_-]{30,1800}$/.test(id))return null;
  let ref:ProviderRef;try{ref=unseal<ProviderRef>('m',id);}catch{return null;}
  if(!['en','id'].includes(ref.language)||typeof ref.provider!=='string'||typeof ref.provider_internal_id!=='string')return null;
  return aggregator.summary(id);
});
