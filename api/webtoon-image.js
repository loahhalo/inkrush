import {proxyWebtoonImage} from '../lib/webtoons.mjs';
export default {fetch(request){return proxyWebtoonImage(request);}};
