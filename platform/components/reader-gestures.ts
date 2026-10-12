// Keep the original reader contract independent of presentation and device events.
export function swipeAction(dx:number,dy:number):{kind:'page'|'chapter';delta:number}|null {
  if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.2)return {kind:'page',delta:dx<0?1:-1};
  if(Math.abs(dy)>100&&Math.abs(dy)>Math.abs(dx)*1.5)return {kind:'chapter',delta:dy<0?1:-1};
  return null;
}
export type WheelState={total:number;last:number;lock:number};
export function wheelChapter(state:WheelState,delta:number,now:number){
  if(now<state.lock)return 0;
  if(now-state.last>180)state.total=0;
  state.total+=delta;state.last=now;
  if(Math.abs(state.total)<=140)return 0;
  const direction=state.total>0?1:-1;state.total=0;state.lock=now+1000;return direction;
}
