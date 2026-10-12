import {handleTrending} from '../lib/trending.mjs';
export default {fetch(request){return handleTrending(request);}};
