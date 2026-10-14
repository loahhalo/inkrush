import type {MetadataRoute} from 'next';
import {searchCatalog} from '../server/search-pages.ts';
import {browseCategories,comicPath,SITE_URL,type BrowseCategory} from '../shared/seo.ts';
import {guides} from '../shared/guides.ts';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const entries:MetadataRoute.Sitemap=[{url:SITE_URL+'/'},{url:SITE_URL+'/guides'},...Object.keys(browseCategories).map(c=>({url:SITE_URL+'/browse/'+c})),...guides.map(g=>({url:SITE_URL+'/guides/'+g.slug}))];const feeds=await Promise.allSettled((['popular','latest'] as BrowseCategory[]).map(searchCatalog));const seen=new Set<string>();for(const feed of feeds)if(feed.status==='fulfilled')for(const comic of feed.value.comics){const path=comicPath(comic);if(seen.has(path)||['erotica','pornographic'].includes(comic.contentRating||''))continue;seen.add(path);entries.push({url:SITE_URL+path});}return entries;}
