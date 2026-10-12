import {handleCentral} from '../../../lib/weebcentral.mjs';
export async function GET(request: Request) { return handleCentral(request); }
