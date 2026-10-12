export function pageFrameHeight(viewportHeight:number,canvasTop:number,navigationHeight:number){
  // Keep the image and page controls above Android's/browser's fixed navigation.
  return Math.max(180,Math.min(1000,viewportHeight-Math.max(0,canvasTop)-navigationHeight-80));
}
