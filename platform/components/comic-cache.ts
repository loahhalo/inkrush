'use client';
import {ChapterPageCache} from './reading-buffer.ts';
import {api} from './client-api.ts';
import type {ComicDetail,Language} from '../server/types.ts';
const comics=new ChapterPageCache<ComicDetail & {resumeChapterId?:string}>(8,300000);
export function readComicDetail(id:string,language:Language,refresh=false){return comics.load(JSON.stringify([id,language]),()=>api<ComicDetail>('detail',{id,language}),refresh);}
export function retainComicDetail(comic:ComicDetail){return comics.load(JSON.stringify([comic.id,comic.language]),()=>Promise.resolve(comic));}
