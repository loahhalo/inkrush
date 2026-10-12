import {inferMood,samplePages} from './mood.js';
let workerPromise;
function abortable(promise,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(new Error('Analysis cancelled'));return;}const cancel=()=>reject(new Error('Analysis cancelled'));signal.addEventListener('abort',cancel,{once:true});promise.then(value=>{signal.removeEventListener('abort',cancel);resolve(value);},error=>{signal.removeEventListener('abort',cancel);reject(error);});});}
function loadOCR(){
 if(!workerPromise)workerPromise=(async()=>{
  if(!window.Tesseract)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(new Error('Text recognition unavailable'));document.head.append(script);});
  const worker=await window.Tesseract.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',langPath:'https://tessdata.projectnaptha.com/4.0.0'});
  await worker.setParameters({tessedit_pageseg_mode:'11'});return worker;
 })().catch(e=>{workerPromise=null;throw e;});
 return workerPromise;
}
async function readPage(url,signal){
 const response=await fetch(url,{signal});if(!response.ok)throw new Error('Page unavailable');const image=await createImageBitmap(await response.blob());
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=Math.max(96,Math.round(image.height/image.width*96));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 let dark=0,edge=0,previous=255;for(let i=0;i<pixels.length;i+=4){const gray=(pixels[i]+pixels[i+1]+pixels[i+2])/3;if(gray<90)dark++;edge+=Math.abs(gray-previous)/255;previous=gray;}const n=pixels.length/4;
 // Enlarge small printed dialogue for OCR, capped to avoid huge mobile allocations.
 canvas.width=Math.min(1400,image.width*2);canvas.height=Math.round(image.height/image.width*canvas.width);ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
 return {canvas,visual:{dark:dark/n,edge:edge/n}};
}
export async function analyzeChapter(context,{signal,isCurrent,onProgress}){
 const texts=[],visuals=[];let worker=null;
 onProgress('Preparing chapter text recognition…');
 try {worker=await abortable(loadOCR(),signal);}catch{/* Metadata and panels remain usable if the CDN is unavailable. */}
 if(!isCurrent())return null;
 const indexes=samplePages(context.pages.length);
 for(let i=0;i<indexes.length;i++){
  if(!isCurrent()||signal.aborted)return null;onProgress(`Reading sampled page ${i+1} of ${indexes.length}…`);
  try{const {canvas,visual}=await readPage(context.pages[indexes[i]],signal);visuals.push(visual);if(worker){const {data}=await abortable(worker.recognize(canvas),signal);if(data.confidence>=25)texts.push(data.text);}}catch{if(signal.aborted)return null;}
 }
 if(!isCurrent())return null;return {...inferMood({...context,text:texts.join('\n'),visuals}),ocrAvailable:!!worker};
}
