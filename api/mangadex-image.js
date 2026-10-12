import {proxyImage} from '../lib/mangadex-image.mjs';
export default {fetch(request){return proxyImage(request);}};
