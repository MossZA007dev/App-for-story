import {loopCueAt,readSfxCue,sourceForCue,type SfxCue,type SfxTrack} from './sfxCues';
export type CueAudio=Pick<HTMLAudioElement,'src'|'loop'|'volume'|'currentTime'|'play'|'pause'|'load'|'removeAttribute'|'onerror'|'onended'>;
type Clock={set:(run:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void};
export class SfxCueEngine{
 private scene='';private index=-1;private visited=new Set<string>();private loop:CueAudio|null=null;private shot:CueAudio|null=null;private loopKey='';private loopLevel=1;private shotLevel=1;private pendingLoop:unknown=null;private pendingShot:unknown=null;private serial=0;private level=.7;
 constructor(private create:(source:string)=>CueAudio,private error:(message:string)=>void=()=>{},private clock:Clock={set:(run,ms)=>setTimeout(run,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)}){}
 private release(audio:CueAudio|null){if(!audio)return;audio.onerror=null;audio.onended=null;audio.pause();audio.removeAttribute('src');audio.load();}
 private cancelPending(){if(this.pendingLoop!==null)this.clock.clear(this.pendingLoop);if(this.pendingShot!==null)this.clock.clear(this.pendingShot);this.pendingLoop=this.pendingShot=null;this.serial++;}
 stop(){this.cancelPending();this.release(this.loop);this.release(this.shot);this.loop=this.shot=null;this.loopKey='';}
 reset(){this.stop();this.scene='';this.index=-1;this.visited.clear();}
 setVolume(level:number){this.level=Math.max(0,Math.min(1,level));if(this.loop)this.loop.volume=this.level*this.loopLevel;if(this.shot)this.shot.volume=this.level*this.shotLevel;}
 private play(cue:SfxCue,tracks:SfxTrack[],loop:boolean,token:number){if(token!==this.serial)return;const source=sourceForCue(cue,tracks);if(!source){this.error('ไม่พบไฟล์ SFX ที่เล่นได้ เลือกไฟล์เสียงจากคลังหรือเสียงในเครื่องใหม่');return;}
  const audio=this.create(source);audio.loop=loop;audio.volume=this.level*cue.volume;audio.onerror=()=>{if(this.loop===audio||this.shot===audio)this.error('เล่น SFX ไม่สำเร็จ ตรวจไฟล์เสียงและสิทธิ์เข้าถึง');};
  if(loop){this.release(this.loop);this.loop=audio;this.loopLevel=cue.volume;}else{this.release(this.shot);this.shot=audio;this.shotLevel=cue.volume;audio.onended=()=>{if(this.shot===audio){this.release(audio);this.shot=null;}};}
  audio.play().catch(()=>{if(this.loop===audio||this.shot===audio)this.error('เบราว์เซอร์ยังไม่เล่น SFX ลองปิดแล้วเปิด SFX อีกครั้ง');});
 }
 visit(scene:string,index:number,bindings:Record<string,string>,tracks:SfxTrack[]){
  if(scene!==this.scene){this.reset();this.scene=scene;}
  if(index===this.index)return;
  const backwards=this.index>=0&&index<this.index;this.cancelPending();this.index=index;
  if(backwards){this.release(this.shot);this.shot=null;}
  const direct=readSfxCue(bindings[`sfx_${index}`]),context=loopCueAt(index,bindings),nextLoop=context?`${context.index}:${JSON.stringify(context.cue)}`:'';
  if(nextLoop!==this.loopKey){this.release(this.loop);this.loop=null;this.loopKey=nextLoop;if(context){const token=this.serial;this.pendingLoop=this.clock.set(()=>{this.pendingLoop=null;this.play(context.cue,tracks,true,token);},context.index===index?context.cue.delayMs:0);}}
  // A pending delayed loop canceled on navigation must resume without its old delay.
  else if(context&&!this.loop&&this.pendingLoop===null){const token=this.serial;this.pendingLoop=this.clock.set(()=>{this.pendingLoop=null;this.play(context.cue,tracks,true,token);},0);}
  if(direct?.mode==='stop'){this.stop();return;}
  if(direct?.mode==='once'&&!backwards){const key=`${index}:${JSON.stringify(direct)}`;if(this.visited.has(key))return;this.visited.add(key);const token=this.serial;this.pendingShot=this.clock.set(()=>{this.pendingShot=null;this.play(direct,tracks,false,token);},direct.delayMs);}
 }
 preview(cue:SfxCue,tracks:SfxTrack[]){this.stop();if(cue.mode!=='stop'){const token=this.serial;this.pendingShot=this.clock.set(()=>{this.pendingShot=null;this.play(cue,tracks,cue.mode==='loop',token);},cue.delayMs);}}
}
