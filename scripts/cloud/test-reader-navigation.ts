import assert from 'node:assert/strict';
import { adjacentEpisode } from '../../src/lib/story/readerNavigation';
const entry = (id: string, part: number, episode?: number) => ({scene:{id},part:{number:part},...(episode ? {episode:{number:episode}} : {})});
const entries = [entry('a',1,1),entry('b',1,1),entry('c',1,2),entry('d',1,2),entry('e',2,1),entry('f',2,2)];
const ids = (id?: string) => {const result=adjacentEpisode(entries,id);return [result.previous?.scene.id??null,result.next?.scene.id??null]};
assert.deepEqual(ids('b'),[null,'c']); // Skip all remaining scenes in the current EP.
assert.deepEqual(ids('d'),['a','e']); // Previous EP starts at its first scene.
assert.deepEqual(ids('e'),['c','f']); // EP numbers reset across seasons.
assert.deepEqual(ids('f'),['e',null]);
assert.deepEqual(ids('missing'),[null,null]);
assert.deepEqual(adjacentEpisode([],undefined),{previous:null,next:null});
const legacy=[entry('x',1),entry('y',1),entry('z',2)];
assert.equal(adjacentEpisode(legacy,'y').previous?.scene.id,'x');
assert.equal(adjacentEpisode(legacy,'y').next?.scene.id,'z');
console.log('Reader navigation: episode boundaries, season transitions, legacy scenes and empty states passed.');
