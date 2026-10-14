import type {Metadata} from 'next';
import PublicLayout from '../../components/public-layout.tsx';
import {guides} from '../../shared/guides.ts';
export const metadata:Metadata={title:'Manga reading guides',description:'Get more from INKRUSH: find a comic, choose Page or Strip mode, and install the reader on Android.',alternates:{canonical:'/guides'},openGraph:{title:'Manga reading guides | INKRUSH',url:'/guides'}};
export default function Guides(){return <PublicLayout><div className="discover-heading"><span className="eyebrow">MAKE TIME FOR A STORY</span><h1>A better reading session.</h1><p>Practical guides to finding a story and reading comfortably on your phone.</p></div><div className="guide-grid">{guides.map(g=><a className="guide-card" href={'/guides/'+g.slug} key={g.slug}><h2>{g.title}</h2><p>{g.description}</p><span>Read guide →</span></a>)}</div><a className="primary" href="/#discover">Find your next story →</a></PublicLayout>;}
