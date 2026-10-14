import {ImageResponse} from 'next/og';
export const alt='INKRUSH — Manga, manhwa and manhua. One more page.';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',background:'#101114',color:'#f4f3ef',padding:'80px',fontFamily:'sans-serif'}}><div style={{display:'flex',fontSize:38,fontWeight:800,marginBottom:55}}>INKRUSH<span style={{color:'#ff714e'}}>.</span></div><div style={{fontSize:84,fontWeight:800,lineHeight:1.05}}>One more page.</div><div style={{fontSize:32,color:'#ff714e',marginTop:30}}>Manga · Manhwa · Manhua</div><div style={{fontSize:24,color:'#99999f',marginTop:35}}>inkrush.site</div></div>,size);}
