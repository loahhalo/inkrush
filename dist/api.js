import { serverUrl, imageUrl, orderChapters } from './core.js';
export class ExtensionClient {
  constructor(base, token = '') { this.base = serverUrl(base); this.token = token; }
  async request(query, variables = {}) {
    const headers = {'Content-Type':'application/json'};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let response;
    try { response = await fetch(this.base + '/api/graphql', {method:'POST', headers, body:JSON.stringify({query,variables}), signal:AbortSignal.timeout(30000)}); }
    catch { throw new Error('Could not reach the server. Check its URL, HTTPS, and CORS settings.'); }
    if (!response.ok) throw new Error(`Server returned ${response.status}. Check your connection and authentication.`);
    const result = await response.json();
    if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join(' · '));
    if (!result.data) throw new Error('The server did not return GraphQL data.');
    return result.data;
  }
  image(value) {
    const result = imageUrl(value, this.base);
    if (!result || !this.token) return result;
    const url = new URL(result);
    if (url.origin === new URL(this.base).origin) url.searchParams.set('token', this.token);
    return url.href;
  }
  async sources() {
    const data = await this.request('query { sources(first: 500) { nodes { id name lang } } }');
    return data.sources.nodes.filter(s => s.id !== '0').sort((a,b) => a.name.localeCompare(b.name));
  }
  async browse(source, query = '', page = 1) {
    const data = await this.request('mutation($input: FetchSourceMangaInput!) { fetchSourceManga(input: $input) { hasNextPage mangas { id title thumbnailUrl } } }', {input:{source:String(source),type:query ? 'SEARCH' : 'POPULAR',page,query}});
    return {...data.fetchSourceManga, mangas:data.fetchSourceManga.mangas.map(m => ({...m,poster:this.image(m.thumbnailUrl)}))};
  }
  async manga(id) {
    const data = await this.request('mutation($input: FetchMangaAndChaptersInput!) { fetchMangaAndChapters(input: $input) { manga { id title description author genre thumbnailUrl } chapters { id name chapterNumber sourceOrder } } }', {input:{id:Number(id),fetchManga:true,fetchChapters:true}});
    const result = data.fetchMangaAndChapters;
    if (!result.chapters?.length) throw new Error('This title has no available chapters.');
    return {...result.manga,poster:this.image(result.manga.thumbnailUrl),chapters:orderChapters(result.chapters)};
  }
  async pages(id) {
    const data = await this.request('mutation($input: FetchChapterPagesInput!) { fetchChapterPages(input: $input) { pages } }', {input:{chapterId:Number(id)}});
    const pages = data.fetchChapterPages.pages.map(url => this.image(url)).filter(Boolean);
    if (!pages.length) throw new Error('This chapter has no readable pages.');
    return pages;
  }
}
