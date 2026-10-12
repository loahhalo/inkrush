import {Suspense} from 'react';
import ReaderApp from '../components/reader-app.tsx';
import {GridSkeleton} from '../components/shared.tsx';
export default function Home(){return <Suspense fallback={<main className="ssr-fallback"><GridSkeleton/></main>}><ReaderApp/></Suspense>;}
