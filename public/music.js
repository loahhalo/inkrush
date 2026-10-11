import {MOODS,inferMood,matchTracks} from './mood.js';
import {analyzeChapter} from './chapter-analysis.js';
const getStore=(key,fallback)=>{try{return JSON.parse(localStorage.getItem('inkrush:music:'+key))??fallback;}catch{return fallback;}};
const putStore=(key,value)=>{try{localStorage.setItem('inkrush:music:'+key,JSON.stringify(value));}catch{}};
export function youtubeId(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;const id=u.hostname==='youtu.be'?u.pathname.slice(1):['youtube.com','www.youtube.com','music.youtube.com'].includes(u.hostname)?(u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1]):null;return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}}
let ytPromise;
function youtubeAPI(){if(window.YT?.Player)return Promise.resolve(window.YT);if(!ytPromise)ytPromise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('YouTube could not load')),15000);window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve(window.YT);};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);reject(new Error('YouTube could not load'));};document.head.append(script);}).catch(e=>{ytPromise=null;throw e;});return ytPromise;}
export class ChapterSoundtrack {
 constructor(){
  this.context=null;this.key='';this.generation=0;this.analysisQueue=Promise.resolve();this.results=new Map();this.overrides=getStore('overrides',{});this.volume=getStore('volume',35);this.provider=getStore('provider','youtube');this.playing=false;this.player=null;this.playerReady=false;this.visible=true;this.custom=false;
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='music.css';document.head.append(sheet);
  const host=document.createElement('div');host.id='soundtrack';host.innerHTML=`
   <button id="music-launch" aria-label="Open chapter soundtrack" aria-expanded="false"><span class="music-note">♫</span><span><small>CHAPTER SOUNDTRACK</small><strong id="music-badge">Find the mood</strong></span><span class="music-eq" aria-hidden="true">▂▅▃</span></button>
   <section id="music-panel" aria-label="Chapter soundtrack" hidden>
    <header class="music-head"><div><small>READ IT. FEEL IT.</small><h2>Chapter soundtrack<span> ✦</span></h2></div><button id="music-close" aria-label="Close music and stop playback">×</button></header>
    <div class="music-body"><div class="music-chapter" id="music-chapter"></div>
    <div class="music-mood-line"><strong id="music-mood">Calm</strong><span id="music-confidence">Mood estimate</span><button id="music-auto" aria-pressed="true">Auto</button></div>
    <p id="music-reason">A soundtrack that follows the story.</p>
    <div id="music-moods" role="group" aria-label="Choose chapter mood"></div>
    <div class="music-track"><span class="music-record">♫</span><div><strong id="music-track-title"></strong><small id="music-artist"></small></div><button id="music-next" aria-label="Try another soundtrack">↻</button></div>
    <div class="music-controls"><button id="music-play">Play soundtrack</button><label>Volume<input id="music-volume" aria-label="Music volume" type="range" min="0" max="100"></label><select id="music-provider" aria-label="Music playback source"><option value="youtube">YouTube</option><option value="audio">Licensed audio</option></select></div>
    <p id="music-status" role="status" aria-live="polite">Press play to start. Music follows each chapter.</p>
    <div id="music-video" hidden><div id="youtube-player"></div></div>
    <audio id="music-audio" preload="none"></audio>
    <div class="music-footer"><a id="music-credit" target="_blank" rel="noopener">Track credits · CC BY 4.0 ↗</a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">License ↗</a><a id="music-search" target="_blank" rel="noopener">More on YouTube Music ↗</a></div>
    <details class="music-custom"><summary>Use your own YouTube song</summary><form id="music-link-form"><input id="music-link" type="url" aria-label="YouTube song URL" placeholder="https://www.youtube.com/watch?v=…" required><button>Use song</button></form><small>One song for this chapter. Auto returns to mood matching.</small></details>
   </div></section>`;document.body.append(host);this.host=host;this.$=selector=>host.querySelector(selector);
  this.$('#music-volume').value=this.volume;this.$('#music-provider').value=this.provider;
  for(const [id,label]of Object.entries(MOODS)){const button=document.createElement('button');button.textContent=label;button.dataset.mood=id;button.setAttribute('aria-pressed','false');button.onclick=()=>{this.overrides[this.key]=id;putStore('overrides',this.overrides);this.custom=false;this.applyResult(this.result,true);};this.$('#music-moods').append(button);}
  this.$('#music-launch').onclick=()=>this.open();this.$('#music-close').onclick=()=>this.close();
  this.$('#music-play').onclick=()=>this.playing?this.pause():this.play();
  this.$('#music-auto').onclick=()=>{delete this.overrides[this.key];putStore('overrides',this.overrides);this.custom=false;this.applyResult(this.result,true);this.analyze();};
  this.$('#music-next').onclick=()=>{this.custom=false;const tracks=matchTracks(this.mood);const index=tracks.findIndex(t=>t.id===this.track?.id);this.selectTrack(tracks[(index+1)%tracks.length]);};
  this.$('#music-volume').oninput=e=>{this.volume=Number(e.target.value);this.audio.volume=this.volume/100;this.player?.setVolume?.(this.volume);putStore('volume',this.volume);};
  this.$('#music-provider').onchange=()=>{const resume=this.playing;this.pause();this.provider=this.$('#music-provider').value;putStore('provider',this.provider);this.$('#music-video').hidden=this.provider!=='youtube';if(resume)this.play();else this.status('Press play to start '+(this.provider==='youtube'?'YouTube.':'licensed audio.'));};
  this.$('#music-link-form').onsubmit=e=>{e.preventDefault();const id=youtubeId(this.$('#music-link').value);if(!id){this.status('Enter a valid YouTube video link.');return;}this.pause();this.custom=true;this.provider='youtube';this.$('#music-provider').value='youtube';this.selectTrack({id:'custom-'+id,title:'Your YouTube song',artist:'Custom chapter soundtrack',video:id,credit:'https://www.youtube.com/watch?v='+id});this.status('Song selected. Press Play soundtrack.');};
  this.audio=this.$('#music-audio');this.audio.volume=this.volume/100;this.audio.onended=()=>{if(this.playing)this.audio.play().catch(()=>this.pause());};this.audio.onerror=()=>{if(this.provider==='audio'){this.pause();this.status('This audio is unavailable. Try YouTube or another soundtrack.');}};
  this.audio.onplaying=()=>{this.playing=true;this.updateControls();this.status('Playing licensed audio · music follows the chapter.');};
  new IntersectionObserver(entries=>{this.visible=entries[0].intersectionRatio>=.5;if(!this.visible&&this.provider==='youtube'&&this.playing){this.pause();this.status('YouTube paused while the player is out of view.');}},{threshold:[0,.5,1]}).observe(this.$('#music-video'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.provider==='youtube'&&this.playing)this.pause();});
 }
 update(context){
  const key=context.source+':'+context.mangaId+':'+context.chapterId;if(key===this.key)return;
  this.abort?.abort();this.generation++;this.context=context;this.key=key;this.custom=false;this.analysisKey='';
  this.$('#music-chapter').textContent=`Chapter ${context.chapterNumber} · ${context.mangaTitle}`;
  this.result=this.results.get(key)||inferMood(context);this.applyResult(this.result,true);
  if(!this.$('#music-panel').hidden)this.analyze();
 }
 open(){this.$('#music-panel').hidden=false;this.$('#music-launch').hidden=true;this.$('#music-launch').setAttribute('aria-expanded','true');this.analyze();}
 close(){this.pause();this.$('#music-panel').hidden=true;this.$('#music-launch').hidden=false;this.$('#music-launch').setAttribute('aria-expanded','false');this.$('#music-launch').focus();}
 status(text){this.$('#music-status').textContent=text;}
 updateControls(){this.$('#music-play').textContent=this.playing?'Pause music':'Play soundtrack';this.$('#music-launch').classList.toggle('is-playing',this.playing);}
 applyResult(result,choose=false){
  this.result=result;const override=this.overrides[this.key];const mood=override||result.mood;const changed=mood!==this.mood;this.mood=mood;
  this.$('#music-badge').textContent=MOODS[mood]+' · Music';this.$('#music-mood').textContent=MOODS[mood];this.$('#music-confidence').textContent=override?'Your choice':result.confidence==='moderate'?'Moderate signal':'Low confidence';this.$('#music-auto').setAttribute('aria-pressed',String(!override&&!this.custom));
  const clues=result.evidence.map(e=>e.word).join(', ');this.$('#music-reason').textContent=override?'You set the mood for this chapter.':`${result.basis}${clues?' · '+clues:''}. ${result.words?result.words+' words read across '+result.sampled+' sampled pages.':result.sampled?'No readable dialogue found in '+result.sampled+' sampled pages.':'Open music to sample chapter dialogue.'} Mood is an estimate.`;
  for(const button of this.$('#music-moods').children)button.setAttribute('aria-pressed',String(button.dataset.mood===mood));
  this.$('#music-search').href='https://music.youtube.com/search?q='+encodeURIComponent(mood+' instrumental reading music');
  if(!this.custom&&(choose||changed||!this.track))this.selectTrack(matchTracks(mood)[0]);
 }
 selectTrack(track){const changed=track.id!==this.track?.id;this.track=track;this.$('#music-track-title').textContent=track.title;this.$('#music-artist').textContent=track.artist;this.$('#music-credit').href=track.credit;this.$('#music-credit').textContent=track.audio?'Scott Buckley · CC BY 4.0 ↗':'Open on YouTube ↗';if(changed&&this.playing)this.play();}
 analyze(){
  if(!this.context||this.analysisKey===this.key||this.results.has(this.key))return;const generation=this.generation,key=this.key,context=this.context;this.analysisKey=key;const controller=this.abort=new AbortController();const signal=controller.signal;
  this.analysisQueue=this.analysisQueue.catch(()=>{}).then(async()=>{if(generation!==this.generation)return;this.$('#music-reason').textContent='Reading chapter dialogue and panel tone… You can keep reading.';const timer=setTimeout(()=>controller.abort(),90000);try{const result=await analyzeChapter(context,{signal,isCurrent:()=>generation===this.generation&&!signal.aborted,onProgress:text=>{if(generation===this.generation)this.$('#music-reason').textContent=text+' You can keep reading.';}});if(result&&generation===this.generation){this.results.set(key,result);if(this.results.size>40)this.results.delete(this.results.keys().next().value);this.applyResult(result);}}catch{/* Keep the metadata estimate. */}finally{clearTimeout(timer);if(generation===this.generation&&!this.results.has(key)){this.applyResult({...this.result,basis:'Story context only — chapter text unavailable'});this.analysisKey='';}}});
 }
 pause(){this.playRequest=(this.playRequest||0)+1;this.playing=false;this.audio.pause();this.player?.pauseVideo?.();this.updateControls();}
 async play(){
  const request=this.playRequest=(this.playRequest||0)+1;this.playing=true;this.updateControls();
  if(this.provider==='audio'){
   this.player?.pauseVideo?.();this.$('#music-video').hidden=true;if(!this.track.audio){this.pause();this.status('Custom songs use the YouTube player. Choose Auto for licensed audio.');return;}
   if(this.audio.getAttribute('src')!==this.track.audio)this.audio.src=this.track.audio;
   try{await this.audio.play();}catch{if(request===this.playRequest){this.pause();this.status('Press Play soundtrack to allow music in this browser.');}}return;
  }
  this.audio.pause();this.$('#music-video').hidden=false;this.status('Connecting to YouTube…');
  try{
   const YT=await youtubeAPI();if(request!==this.playRequest)return;
   if(!this.player){await new Promise(resolve=>{this.player=new YT.Player('youtube-player',{width:'100%',height:'200',videoId:this.track.video,playerVars:{playsinline:1,controls:1,origin:location.origin},events:{onReady:()=>{this.playerReady=true;resolve();},onStateChange:e=>{if(this.provider!=='youtube')return;if(e.data===YT.PlayerState.PLAYING){this.playing=true;this.updateControls();this.status('Playing on YouTube · music follows the chapter.');}if(e.data===YT.PlayerState.PAUSED){this.playing=false;this.updateControls();}if(e.data===YT.PlayerState.ENDED&&this.playing)this.player.seekTo(0,true);},onError:()=>this.fallback(),onAutoplayBlocked:()=>{this.playing=false;this.updateControls();this.status('Tap Play in the YouTube player to allow playback.');}}});});}
   if(request!==this.playRequest)return;this.player.setVolume(this.volume);if(document.hidden){this.pause();return;}
   const rect=this.$('#music-video').getBoundingClientRect();if(rect.bottom<100||rect.top>innerHeight-100){this.pause();this.status('Keep the YouTube player visible to play music.');return;}
   if(this.loadedVideo!==this.track.video){this.loadedVideo=this.track.video;this.player.loadVideoById(this.track.video);}else this.player.playVideo();
  }catch{if(request===this.playRequest)this.fallback();}
 }
 fallback(){if(this.provider!=='youtube')return;this.pause();if(this.track.audio){this.provider='audio';this.$('#music-provider').value='audio';this.$('#music-video').hidden=true;this.status('YouTube is unavailable here. Press Play for licensed audio.');}else this.status('YouTube could not play this video. Try another song or Auto.');}
}
