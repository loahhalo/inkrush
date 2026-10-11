import type { Metadata } from 'next';
export const metadata: Metadata = {title:'INKRUSH — One more page.',description:'Real manga. Swipe for pages, scroll for chapters.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
