import type {NextConfig} from 'next';
import path from 'node:path';
const config: NextConfig = {
  output:'standalone', outputFileTracingRoot:path.resolve(import.meta.dirname,'..'),
  poweredByHeader:false, experimental:{cpus:1},
  images:{localPatterns:[{pathname:'/api/proxy/image'}],formats:['image/webp'],minimumCacheTTL:86400,maximumDiskCacheSize:128*1024*1024},
  async headers(){return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'},{key:'Service-Worker-Allowed',value:'/'}]},{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}]}];},
  async rewrites(){return [{source:'/reader',destination:'/'},{source:'/reader.html',destination:'/'}];}
};
export default config;
