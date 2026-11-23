import assert from 'node:assert/strict';
import {SfxCueEngine,type CueAudio} from '../../src/lib/audio/sfxCueEngine';
import {readSfxCue,remapDialogueBindings,sourceForCue,type SfxCue} from '../../src/lib/audio/sfxCues';
import {builtinSfxUrl} from '../../src/lib/audio/sfxBuiltins';
class AudioStub implements CueAudio{loop=false;volume=1;currentTime=0;plays=0;pauses=0;loads=0;onerror:CueAudio['onerror']=null;onended:CueAudio['onended']=null;constructor(public src:string){}play(){this.plays++;return Promise.resolve();}pause(){this.pauses++;}load(){this.loads++;}removeAttribute(){this.src='';}}
async function main(){
let now=0,nextId=0;const timers=new Map<number,{at:number;run:()=>void}>();const clock={set:(run:()=>void,ms:number)=>{const id=++nextId;timers.set(id,{at:now+ms,run});return id;},clear:(id:unknown)=>{timers.delete(id as number);}};
function tick(ms=0){now+=ms;for(const[id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.run();}}
const played:AudioStub[]=[],errors:string[]=[];const engine=new SfxCueEngine(source=>{const audio=new AudioStub(source);played.push(audio);return audio;},message=>errors.push(message),clock);
const cue=(mode:SfxCue['mode']='once',delayMs=0)=>JSON.stringify({mode,source:'builtin:door',name:'Door',volume:.5,delayMs});
const bindings={'sfx_0':cue('once',100),'sfx_2':cue()};
engine.visit('scene',0,bindings,[]);tick(50);assert.equal(played.length,0);engine.visit('scene',1,bindings,[]);tick(200);assert.equal(played.length,0,'leaving a beat cancels delayed sound');
engine.visit('scene',2,bindings,[]);tick();assert.equal(played.length,1);engine.visit('scene',2,bindings,[]);engine.setVolume(.4);assert.equal(played[0].volume,.2);assert.equal(played.length,1,'volume/rerenders do not replay');
engine.visit('scene',1,bindings,[]);engine.visit('scene',2,bindings,[]);tick();assert.equal(played.length,1,'backtracking cannot retrigger a visited one-shot');
const loopBindings={'sfx_0':cue('loop'),'sfx_2':cue(),'sfx_3':cue('stop')};
engine.visit('loop-scene',0,loopBindings,[]);tick();const loop=played.at(-1)!;assert.equal(loop.loop,true);loop.currentTime=9;
engine.visit('loop-scene',1,loopBindings,[]);tick();assert.equal(loop.pauses,0);assert.equal(loop.currentTime,9,'loop continues across beats without restart');
engine.visit('loop-scene',2,loopBindings,[]);tick();const shot=played.at(-1)!;assert.notEqual(shot,loop);assert.equal(shot.loop,false);assert.equal(loop.pauses,0,'one-shot overlays loop');
engine.visit('loop-scene',3,loopBindings,[]);assert.ok(loop.pauses);assert.ok(shot.pauses);assert.equal(timers.size,0);
engine.visit('loop-scene',1,loopBindings,[]);tick();assert.equal(played.at(-1)!.loop,true,'rewind restores loop context');
const previous=played.at(-1)!;engine.visit('new-scene',0,{},[]);assert.ok(previous.pauses,'scene/EP change stops loop');
engine.preview(readSfxCue(cue('once',500))!,[]);engine.reset();const count=played.length;tick(1000);assert.equal(played.length,count,'dispose cancels pending preview');
engine.visit('jump',5,{'sfx_0':cue(),'sfx_1':cue('loop')},[]);tick();assert.equal(played.at(-1)!.loop,true);assert.equal(played.length,count+1,'jump restores loop without replaying skipped one-shots');engine.reset();
assert.equal(sourceForCue({source:'url:javascript:alert(1)',mode:'once',name:'',volume:1,delayMs:0},[]),'');
assert.equal(sourceForCue({source:'url:https://youtu.be/aaaaaaaaaaa',mode:'once',name:'',volume:1,delayMs:0},[]),'');
assert.equal(readSfxCue('not json'),null);assert.equal(readSfxCue('{"mode":"once","source":"builtin:door","volume":90,"delayMs":-5}')!.volume,1);
const attached={'0':'image','audio_0':'music','sfx_0':cue(),'sfx_1':cue('loop'),'1':'second',other:'keep'};
const moved=remapDialogueBindings(attached,i=>i===0?1:0);assert.equal(moved.sfx_1,attached.sfx_0);assert.equal(moved.audio_1,'music');assert.equal(moved['1'],'image');assert.equal(moved.other,'keep');
const deleted=remapDialogueBindings(attached,i=>i===0?null:i-1);assert.equal(deleted.sfx_0,attached.sfx_1);assert.equal(deleted.audio_0,undefined);assert.equal(deleted['0'],'second');
assert.equal(remapDialogueBindings(attached,i=>i+1).sfx_2,attached.sfx_1);
for(const kind of ['door','thunder','blade','step','rain','wind']){const url=builtinSfxUrl(kind),bytes=await (await fetch(url)).arrayBuffer();assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.ok(bytes.byteLength>1000);URL.revokeObjectURL(url);}
assert.equal(errors.length,0);const blockedErrors:string[]=[];const blocked=new SfxCueEngine(source=>{const audio=new AudioStub(source);audio.play=()=>Promise.reject(new Error('blocked'));return audio;},message=>blockedErrors.push(message),clock);blocked.preview(readSfxCue(cue())!,[]);tick();await Promise.resolve();assert.equal(blockedErrors.length,1,'blocked playback must report an actionable error');blocked.reset();console.log('PASS: one-shot deduplication, delayed cancellation, independent loop/shot channels, loop reconstruction, stop cues, scene cleanup, volume changes, attachment remapping, safe sources and six local WAV effects. No network audio or paid API calls.');

}
main().catch(e=>{console.error(e);process.exitCode=1;});
