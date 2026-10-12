export type Point={x:number;y:number};
export function clampZoom(value:number){return Number.isFinite(value)?Math.min(3,Math.max(1,Math.round(value*100)/100)):1;}
export function pinchZoom(initialZoom:number,initialDistance:number,distance:number){return initialDistance>0?clampZoom(initialZoom*distance/initialDistance):clampZoom(initialZoom);}
export function clampPan(point:Point,zoom:number,width:number,height:number,imageWidth:number,imageHeight:number,segmented=false):Point {
  if(zoom<=1||!(width>0&&height>0&&imageWidth>0&&imageHeight>0))return {x:0,y:0};
  const scale=Math.min(width/imageWidth,height/imageHeight);
  const visibleWidth=segmented?width:imageWidth*scale,visibleHeight=segmented?height:imageHeight*scale;
  const x=Math.max(0,(visibleWidth*zoom-width)/2),y=Math.max(0,(visibleHeight*zoom-height)/2);
  return {x:x?Math.max(-x,Math.min(x,point.x)):0,y:y?Math.max(-y,Math.min(y,point.y)):0};
}
export async function enterFullscreen(doc:Pick<Document,'fullscreenEnabled'|'fullscreenElement'|'documentElement'>){
  if(doc.fullscreenElement===doc.documentElement)return true;
  if(!doc.fullscreenEnabled||!doc.documentElement.requestFullscreen)return false;
  try{await doc.documentElement.requestFullscreen({navigationUI:'hide'});return true;}catch{return false;}
}
export async function leaveFullscreen(doc:Pick<Document,'fullscreenElement'|'documentElement'|'exitFullscreen'>){
  if(doc.fullscreenElement!==doc.documentElement)return;
  try{await doc.exitFullscreen();}catch{}
}
