import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest {
  return {
    id:'/',name:'INKRUSH — One more page.',short_name:'INKRUSH',
    description:'Read manga, manhwa and manhua in English and Bahasa Indonesia.',
    start_url:'/?installed=1#discover',scope:'/',display:'standalone',
    background_color:'#101114',theme_color:'#101114',lang:'en',
    categories:['books','entertainment'],prefer_related_applications:false,
    icons:[
      {src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
      {src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
    ],
    shortcuts:[
      {name:'Discover stories',short_name:'Discover',url:'/#discover'},
      {name:'Continue reading',short_name:'Reader',url:'/#read'},
      {name:'My library',short_name:'Library',url:'/#library'},
    ],
  };
}
