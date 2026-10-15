export function suggestionIndex(current:number,direction:1|-1,count:number){if(count<=0)return -1;if(current<0||current>=count)return direction===1?0:count-1;return (current+direction+count)%count;}
