// An explainable heuristic, not a claim to understand the entire story.
export const MOODS={calm:'Calm',reflective:'Reflective',tense:'Tense',epic:'Epic',joyful:'Joyful',romantic:'Romantic'};
const words={
 calm:['peace','quiet','rest','sleep','gentle','relax','garden','home','calm','breathe','comfort','cafe'],
 reflective:['sad','cry','tear','grief','death','died','die','lost','loss','lonely','regret','memory','memories','goodbye','sorry','pain','suffer','hospital','patient','doctor','illness','funeral'],
 tense:['fear','afraid','danger','kill','murder','blood','escape','panic','threat','scream','horror','monster','dark','terrify','urgent','emergency','secret','betray','suspicion'],
 epic:['fight','battle','war','sword','power','hero','victory','attack','defeat','dragon','charge','strike','warrior','destroy','strong','courage','save'],
 joyful:['happy','laugh','smile','fun','celebrate','party','joke','great','wonderful','amazing','friend','delight','congratulat','cheer'],
 romantic:['love','kiss','romance','romantic','date','crush','darling','marry','wedding','embrace','blush','sweetheart','together','heart']
};
const genreMood={action:'epic',adventure:'epic',martial:'epic',horror:'tense',thriller:'tense',mystery:'tense',psychological:'tense',drama:'reflective',medical:'reflective',tragedy:'reflective',comedy:'joyful',romance:'romantic',slice:'calm'};
export function samplePages(length){if(!length)return [];return [...new Set([.2,.5,.8].map(p=>Math.min(length-1,Math.floor(length*p))))];}
export function inferMood({title='',description='',genres=[],text='',visuals=[]}={}){
 const scores=Object.fromEntries(Object.keys(MOODS).map(k=>[k,.15]));const hits=[];
 function score(source,weight,label){const tokens=source.toLowerCase().match(/[a-z]+/g)||[];const counts=new Map();tokens.forEach((token,i)=>{for(const [mood,roots] of Object.entries(words)){const root=roots.find(r=>token===r||(r.length>3&&token.startsWith(r)));if(!root)continue;const countKey=mood+root;const count=counts.get(countKey)||0;if(count>=3)continue;counts.set(countKey,count+1);const negated=tokens.slice(Math.max(0,i-3),i).some(w=>['not','never','no','without'].includes(w));scores[mood]+=weight*(negated?.15:1);if(!negated)hits.push({word:token,mood,source:label,weight});}});}
 score(title,3,'chapter title');score(description,.35,'story description');score(text,1.5,'page dialogue');
 for(const genre of genres){for(const [word,mood] of Object.entries(genreMood)){if(genre.toLowerCase().includes(word)){scores[mood]+=1.2;hits.push({word:genre,mood,source:'genre',weight:1.2});}}}
 // Panel tone is only a weak tie-breaker. Black-and-white art is not inherently sad.
 if(visuals.length){const dark=visuals.reduce((s,v)=>s+v.dark,0)/visuals.length;const edge=visuals.reduce((s,v)=>s+v.edge,0)/visuals.length;if(dark>.45)scores.tense+=Math.min(.5,(dark-.45)*2);if(edge<.07)scores.calm+=.25;}
 const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);const [mood,top]=ranked[0];const margin=top-ranked[1][1];const hasText=text.trim().split(/\s+/).length>=20;
 const evidence=hits.filter(h=>h.mood===mood).sort((a,b)=>b.weight-a.weight).filter((h,i,a)=>a.findIndex(x=>x.word===h.word)===i).slice(0,3);
 const confidence=top<1?'low':hasText&&margin>3?'moderate':'low';
 return {mood:top<1?'calm':mood,confidence,scores,evidence,sampled:visuals.length,words:text.trim()?text.trim().split(/\s+/).length:0,basis:hasText?'Chapter dialogue + story context':visuals.length?'Story context + sampled panels':'Story context only'};
}
const audioRoot='https://www.scottbuckley.com.au/library/wp-content/uploads/';
export const TRACKS=[
 {id:'reverie',title:'Reverie',video:'U5jC7ouN3e4',file:'2020/03/sb_reverie.mp3',moods:{calm:1,romantic:.65,reflective:.55}},
 {id:'undertow',title:'Undertow',video:'mGpFFxNOiII',file:'2019/12/sb_undertow.mp3',moods:{reflective:1,calm:.5,romantic:.35}},
 {id:'signal-to-noise',title:'Signal to Noise',video:'x43OJXk8idI',file:'2020/04/sb_signaltonoise.mp3',moods:{tense:1,reflective:.5,epic:.3}},
 {id:'ascension',title:'Ascension',video:'fMx5roxJ7Uk',file:'2019/02/sb_ascension.mp3',moods:{epic:1,reflective:.45,tense:.35}},
 {id:'ice-cream',title:'Ice Cream',video:'7EeWSPv5dBI',file:'2023/08/IceCream.mp3',moods:{joyful:1,calm:.4,romantic:.4}},
 {id:'first-snow',title:'First Snow',video:'1o-Dkf1EuT0',file:'2022/12/FirstSnow.mp3',moods:{romantic:1,calm:.8,joyful:.6}}
].map(t=>({...t,artist:'Scott Buckley',audio:audioRoot+t.file,credit:`https://www.scottbuckley.com.au/library/${t.id}/`}));
export function matchTracks(mood,skip=[]){return TRACKS.filter(t=>!skip.includes(t.id)).map(t=>({track:t,score:t.moods[mood]||0})).sort((a,b)=>b.score-a.score).map(v=>v.track);}
