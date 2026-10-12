export const canReadStrip = story => !story.demo && (String(story.id).startsWith('wt:') || story.format === 'Webtoon');

// Native scrolling keeps touch momentum and never interprets a scroll as a chapter change.
export class WebtoonStrip {
  constructor(host,onPosition,onChapter){this.host=host;this.onPosition=onPosition;this.onChapter=onChapter;this.key='';this.offset=0;this.host.addEventListener('scroll',()=>{cancelAnimationFrame(this.raf);this.raf=requestAnimationFrame(()=>this.measure());},{passive:true});}
  show(key,urls,title,index=0,offset=0,hasPrevious=false,hasNext=false){
    this.host.hidden=false;if(this.key===key)return;
    cancelAnimationFrame(this.raf);this.key=key;this.host.replaceChildren();this.images=[];
    urls.forEach((url,i)=>{const block=document.createElement('div');block.className='strip-image';const image=document.createElement('img');image.src=url;image.alt=`${title}, image ${i+1}`;image.loading=i<=index+1?'eager':'lazy';image.decoding='async';image.width=800;image.height=1280;
      image.onload=()=>{const before=block.offsetHeight;image.height=image.naturalHeight;image.width=image.naturalWidth;if(i<this.index)this.host.scrollTop+=block.offsetHeight-before;};
      image.onerror=()=>{if(block.querySelector('button'))return;const retry=document.createElement('button');retry.className='secondary';retry.textContent=`Image ${i+1} couldn’t load · Retry`;retry.onclick=()=>{retry.remove();image.src=url;};block.append(retry);};
      block.append(image);this.host.append(block);this.images.push(block);});
    const footer=document.createElement('div');footer.className='strip-footer';const label=document.createElement('p');label.textContent='End of chapter';footer.append(label);
    for(const [delta,text,enabled]of [[-1,'Previous chapter',hasPrevious],[1,'Next chapter',hasNext]]){const button=document.createElement('button');button.className='secondary';button.textContent=text;button.disabled=!enabled;button.onclick=()=>this.onChapter(delta);footer.append(button);}this.host.append(footer);
    this.index=index;requestAnimationFrame(()=>{if(this.key===key)this.go(index,offset);});
  }
  hide(){this.host.hidden=true;}
  go(index,offset=0){const block=this.images?.[index];if(!block)return;this.index=index;this.host.scrollTop=block.offsetTop+Math.max(0,Math.min(1,offset))*block.offsetHeight;this.measure();}
  measure(){if(this.host.hidden||!this.images?.length)return;const top=this.host.scrollTop;let i=0;while(i<this.images.length-1&&this.images[i+1].offsetTop<=top+8)i++;this.index=i;this.offset=Math.max(0,Math.min(1,(top-this.images[i].offsetTop)/this.images[i].offsetHeight));this.onPosition(i,this.offset);}
}
