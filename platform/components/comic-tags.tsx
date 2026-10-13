import type {Comic} from '../server/types.ts';
import {ratingLabel,demographicLabel} from '../shared/content.ts';
export default function ComicTags({comic,compact=false}:{comic:Comic;compact?:boolean}){if(compact){const tags=[...comic.genre,...comic.themes||[]].slice(0,2);return <div className="card-tags" aria-label="Comic tags"><span>{comic.format}</span><span>{ratingLabel(comic.contentRating)}</span>{comic.demographic?<span>{demographicLabel(comic.demographic)}</span>:null}{tags.map(tag=><span key={tag}>{tag}</span>)}</div>;}
  const groups=[['Content rating',[ratingLabel(comic.contentRating),...comic.contentTags||[]]],['Type',[comic.format]],['Demographic',[demographicLabel(comic.demographic)]],['Genres',comic.genre],['Themes',comic.themes||[]]] as const;
  return <dl className="comic-taxonomy" aria-label="Comic tags">{groups.map(([name,tags])=><div key={name}><dt>{name}</dt><dd>{tags.length?tags.map(tag=><span key={tag}>{tag}</span>):<span className="unprovided">Not provided</span>}</dd></div>)}</dl>;
}
