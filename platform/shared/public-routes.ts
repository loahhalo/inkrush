import {browseCategories} from './seo.ts';
import {guides} from './guides.ts';
export function validPublicRoute(pathname:string){const parts=pathname.split('/').filter(Boolean);if(parts[0]==='browse')return parts.length===2&&Object.hasOwn(browseCategories,parts[1]);if(parts[0]==='guides')return parts.length===1||parts.length===2&&guides.some(g=>g.slug===parts[1]);return true;}
