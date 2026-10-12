import fs from 'node:fs/promises';
import {buildRanking,baseline} from '../lib/trending.mjs';
await fs.mkdir('lib/data',{recursive:true});
for(const language of ['en','id']){const previous=await baseline(language);const result=await buildRanking(language,previous);await fs.writeFile(`lib/data/trending-${language}.json`,JSON.stringify(result));console.log(language,result.mangas.length,'titles; anime metadata failures:',result.metadataFailures);}
