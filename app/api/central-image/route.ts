import {proxyCentralImage} from '../../../lib/weebcentral.mjs';
export async function GET(request: Request) { return proxyCentralImage(request); }
