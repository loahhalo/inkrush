import { proxyMangaDex } from '../../../../lib/mangadex-proxy.mjs';
export async function GET(request:Request,context:{params:Promise<{path:string[]}>}) {
  const {path}=await context.params;
  return proxyMangaDex(request,path);
}
