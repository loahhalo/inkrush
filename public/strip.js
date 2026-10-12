export function stripMetrics(width,height,frameWidth,frameHeight){
  if(!(width>0&&height>0&&frameWidth>0&&frameHeight>0)||height/width<=2.4)return {total:1,step:0,maxOffset:0};
  const scaledHeight=height*frameWidth/width,maxOffset=Math.max(0,scaledHeight-frameHeight),step=frameHeight*.85;
  return {total:Math.max(1,Math.ceil(maxOffset/step)+1),step,maxOffset};
}
export class StripPager {
  constructor(frame,image,onChange){this.frame=frame;this.image=image;this.onChange=onChange;this.url='';this.slice=0;this.total=1;image.addEventListener('load',()=>this.draw());new ResizeObserver(()=>this.draw()).observe(frame);}
  show(url,slice=0){if(!url){this.url='';this.slice=0;this.total=1;this.frame.classList.remove('strip-page');this.image.style.transform='';return;}if(url!==this.url){this.url=url;this.slice=Math.max(0,Number.isFinite(slice)?slice:0);this.total=1;this.frame.classList.remove('strip-page');this.image.style.transform='';this.image.src=url;}else{this.slice=Math.max(0,Number.isFinite(slice)?slice:0);if(this.image.complete&&!this.image.naturalWidth)this.image.src=url;}this.draw();}
  draw(){if(!this.url||this.image.hidden||!this.image.complete||!this.image.naturalWidth)return;
    const metrics=stripMetrics(this.image.naturalWidth,this.image.naturalHeight,this.frame.clientWidth,this.frame.clientHeight);this.total=metrics.total;this.slice=Math.min(this.slice,this.total-1);this.frame.classList.toggle('strip-page',this.total>1);this.image.style.transform=this.total>1?`translateY(-${Math.min(this.slice*metrics.step,metrics.maxOffset)}px)`:'';this.onChange(this.slice,this.total);
  }
  advance(delta){if(this.slice+delta<0||this.slice+delta>=this.total)return false;this.slice+=delta;this.draw();return true;}
}
