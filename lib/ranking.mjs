const DAY=86400000;
const positive=value=>Math.max(0,Number(value)||0);
export function animeBoost(statuses=[]){return statuses.includes('RELEASING')?20:statuses.includes('NOT_YET_RELEASED')?10:0;}
export function rankComics(current,previous,now=Date.now()){
  const days=previous?(now-Date.parse(previous.generatedAt))/DAY:0;
  const prior=new Map((previous?.observations||[]).map(m=>[m.id,m]));
  const rows=current.map(m=>{const old=prior.get(m.id),updated=Date.parse(m.updatedAt);return {...m,velocity:old&&days>=.75&&days<=8?positive(m.follows-old.follows)/days:null,freshness:Number.isFinite(updated)?Math.exp(-positive(now-updated)/(14*DAY)):0};});
  const scale=key=>{const values=rows.map(m=>Math.log1p(positive(m[key]))).sort((a,b)=>a-b);const ceiling=values[Math.floor((values.length-1)*.95)]||1;return v=>Math.min(1,Math.log1p(positive(v))/ceiling);};
  const velocity=scale('velocity'),followers=scale('follows');
  return rows.map(m=>{const hasVelocity=m.velocity!==null;const population=hasVelocity?.65*velocity(m.velocity)+.2*followers(m.follows)+.15*m.freshness:(.2*followers(m.follows)+.15*m.freshness)/.35;
    const boost=animeBoost(m.animeStatuses);return {...m,score:Number((80*population+boost).toFixed(3)),scoreDetails:{velocity:m.velocity,baseline:!hasVelocity,animeBoost:boost,animeChecked:!!m.animeChecked}};
  }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
