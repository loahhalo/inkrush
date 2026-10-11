export async function proxyImage(request) {
  let target;
  try { target = new URL(new URL(request.url).searchParams.get('url')); }
  catch { return new Response('Invalid image URL', { status: 400 }); }
  const permitted = target.hostname === 'uploads.mangadex.org'
    ? /^\/covers\/[a-f0-9-]+\/[^/]+\.(?:jpg|png|webp)(?:\.\d+\.jpg)?$/i.test(target.pathname)
    : /^[a-z0-9]+\.mangadex\.network$/i.test(target.hostname) && /^\/data(?:-saver)?\/[a-f0-9]+\/[^/]+\.(?:jpg|jpeg|png|webp)$/i.test(target.pathname);
  if (target.protocol !== 'https:' || target.port || target.username || target.password || !permitted) return new Response('Unknown image source', { status: 400 });
  try {
    const upstream = await fetch(target, { redirect: 'manual', headers: { 'Referer': 'https://mangadex.org/', 'User-Agent': 'INKRUSH/1.0' }, signal: AbortSignal.timeout(25000) });
    if (!upstream.ok || !upstream.headers.get('Content-Type')?.startsWith('image/')) { console.error('MangaDex image response',upstream.status,upstream.headers.get('Content-Type')); return new Response('Image unavailable', { status: 502 }); }
    return new Response(upstream.body, { headers: { 'Content-Type': upstream.headers.get('Content-Type'), 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch(error) { console.error('MangaDex image fetch',error.message); return new Response('Image unavailable', { status: 502 }); }
}
