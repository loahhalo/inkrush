import { proxyImage } from '../../../lib/mangadex-image.mjs';
export async function GET(request: Request) { return proxyImage(request); }
