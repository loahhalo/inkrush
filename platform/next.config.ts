import type {NextConfig} from 'next';
import path from 'node:path';
const config: NextConfig = {
  output:'standalone', outputFileTracingRoot:path.resolve(import.meta.dirname,'..'),
  poweredByHeader:false, experimental:{cpus:1},
  async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}]}];},
  async rewrites(){return [{source:'/reader',destination:'/'},{source:'/reader.html',destination:'/'}];}
};
export default config;
