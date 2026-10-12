import {handleWebtoons} from '../../../lib/webtoons.mjs';
export async function GET(request: Request) { return handleWebtoons(request); }
