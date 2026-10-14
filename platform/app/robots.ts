import type {MetadataRoute} from 'next';
import {SITE_URL} from '../shared/seo.ts';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:['/','/api/proxy/image'],disallow:['/api/','/healthz','/reader','/offline.html']},sitemap:SITE_URL+'/sitemap.xml',host:SITE_URL};}
