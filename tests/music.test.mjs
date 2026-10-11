import test from 'node:test';
import assert from 'node:assert/strict';
import {inferMood,samplePages,matchTracks,MOODS} from '../public/mood.js';
import {youtubeId} from '../public/music.js';
test('Different chapter dialogue changes mood even with identical story metadata',()=>{
 const common={genres:['Drama'],description:'A story about friendship.'};
 assert.equal(inferMood({...common,text:'The battle begins. Attack the dragon! A warrior needs courage and power. Fight for victory.'}).mood,'epic');
 assert.equal(inferMood({...common,text:'I love you darling. Kiss me. Our wedding will be romantic. I blush at your embrace.'}).mood,'romantic');
 assert.equal(inferMood({...common,text:'Danger! The monster will kill us. Escape now. I am afraid. The blood makes me scream.'}).mood,'tense');
});
test('Weak input stays low confidence and monochrome panels alone do not imply sadness',()=>{
 assert.equal(inferMood().confidence,'low');assert.equal(inferMood({visuals:[{dark:.8,edge:.2}]}).confidence,'low');
 const positive=inferMood({text:'love love love'}),negated=inferMood({text:'no love never love not love'});assert.ok(negated.scores.romantic<positive.scores.romantic);
});
test('Sampling handles short chapters without duplicate or out-of-range pages',()=>{
 assert.deepEqual(samplePages(0),[]);assert.deepEqual(samplePages(1),[0]);for(const n of [2,3,26,60]){const indexes=samplePages(n);assert.equal(new Set(indexes).size,indexes.length);assert.ok(indexes.every(i=>i>=0&&i<n));}
});
test('All moods have a ranked soundtrack and skipping does not repeat excluded tracks',()=>{
 for(const mood of Object.keys(MOODS)){const ranked=matchTracks(mood);assert.ok(ranked[0].moods[mood]===1);assert.ok(ranked.every(t=>t.audio.startsWith('https://www.scottbuckley.com.au/')));assert.ok(!matchTracks(mood,[ranked[0].id]).some(t=>t.id===ranked[0].id));}
});
test('YouTube custom links accept real formats and reject spoofed hosts or credentials',()=>{
 assert.equal(youtubeId('https://youtu.be/U5jC7ouN3e4'),'U5jC7ouN3e4');assert.equal(youtubeId('https://music.youtube.com/watch?v=U5jC7ouN3e4'),'U5jC7ouN3e4');assert.equal(youtubeId('https://www.youtube.com/shorts/U5jC7ouN3e4'),'U5jC7ouN3e4');for(const u of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=U5jC7ouN3e4','https://secret@youtube.com/watch?v=U5jC7ouN3e4','https://youtu.be/bad'])assert.equal(youtubeId(u),null);
});
