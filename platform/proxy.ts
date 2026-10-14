import {NextResponse,type NextRequest} from 'next/server';
import {unseal} from './server/identity.ts';
import type {ProviderRef} from './server/types.ts';
// Reject invalid IDs before Next can flush a streamed 200 response.
export function proxy(request:NextRequest){const id=request.nextUrl.pathname.split('/')[2]||'';try{if(!/^m_[A-Za-z0-9_-]{30,1800}$/.test(id))throw Error('Invalid');const ref=unseal<ProviderRef>('m',id);if(!ref||!['en','id'].includes(ref.language)||typeof ref.provider!=='string'||typeof ref.provider_internal_id!=='string')throw Error('Invalid');}catch{return new NextResponse('Comic not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex','Cache-Control':'public, max-age=60'}});}return NextResponse.next();}
export const config={matcher:'/comics/:path*'};
