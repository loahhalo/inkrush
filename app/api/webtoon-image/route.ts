import {proxyWebtoonImage} from '../../../lib/webtoons.mjs';
export async function GET(request: Request) { return proxyWebtoonImage(request); }
