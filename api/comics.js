import {proxyMangaDex} from '../lib/mangadex-proxy.mjs';
export default {
  fetch(request) {
    const url=new URL(request.url);
    const route=url.searchParams.get('path')||'';
    url.searchParams.delete('path');
    return proxyMangaDex(new Request(url,request),route.split('/').filter(Boolean));
  }
};
