import {handleTrendingSync} from '../lib/trending.mjs';
export default {fetch(request){return handleTrendingSync(request);}};
