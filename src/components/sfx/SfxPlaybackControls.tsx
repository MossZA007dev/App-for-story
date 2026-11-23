'use client';
import {useEffect,useState} from 'react';
import {Volume2,VolumeX,RotateCcw,Settings2} from 'lucide-react';
import {readSfxCue,type SfxTrack} from '@/lib/audio/sfxCues';
import {useSfxEngine} from './useSfxEngine';
import './sfx-cues.css';
export function SfxPlaybackControls({sceneId,index,bindings,tracks,active=true}:{sceneId:string;index:number;bindings:Record<string,string>;tracks:SfxTrack[];active?:boolean}){
 const {engine,error,clearError}=useSfxEngine();const[enabled,setEnabled]=useState(false),[volume,setVolume]=useState(.7);
 const signature=JSON.stringify(bindings),library=JSON.stringify(tracks),cue=readSfxCue(bindings[`sfx_${index}`]);
 useEffect(()=>{try{const saved=Number(localStorage.getItem('saga-sfx-volume'));if(localStorage.getItem('saga-sfx-volume')!==null&&Number.isFinite(saved))setVolume(Math.max(0,Math.min(1,saved)));}catch{}},[]);
 useEffect(()=>{engine.current?.setVolume(volume);try{localStorage.setItem('saga-sfx-volume',String(volume));}catch{}},[volume]);
 useEffect(()=>{if(enabled&&active&&sceneId)engine.current?.visit(sceneId,index,JSON.parse(signature),JSON.parse(library));else engine.current?.reset();},[enabled,active,sceneId,index,signature,library]);
 useEffect(()=>{if(!active)setEnabled(false);},[active]);
 useEffect(()=>{const hide=()=>{if(document.hidden){engine.current?.reset();setEnabled(false);}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 return <div className="sfx-playback">
  <button type="button" aria-label={enabled?'ปิด SFX ตามบท':'เปิด SFX ตามบท'} aria-pressed={enabled} disabled={!active||!sceneId} title="เปิดเอฟเฟกต์ตามจังหวะบท โดยไม่เปลี่ยนเพลง SS/EP" onClick={()=>{clearError();setEnabled(!enabled);}}>{enabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>SFX</span></button>
  <details className="sfx-playback-options"><summary aria-label="ตั้งค่าและทดสอบ SFX"><Settings2 size={14}/></summary><div><label>ความดัง SFX <output>{Math.round(volume*100)}%</output><input type="range" aria-label="ความดัง SFX" min="0" max="100" value={Math.round(volume*100)} onChange={e=>setVolume(Number(e.target.value)/100)}/></label><button type="button" disabled={!enabled||!cue} onClick={()=>{if(cue){clearError();engine.current?.preview(cue,tracks);}}}><RotateCcw size={14}/>เล่น SFX บทนี้อีกครั้ง</button><small>ย้อนบทจะไม่เล่นเสียงครั้งเดียวซ้ำเอง เสียงวนหยุดเมื่อเจอจุดหยุดหรือเปลี่ยนฉาก</small>{error&&<p role="alert">{error}</p>}</div></details>
  {error&&<span className="sfx-error-dot" title={error} role="status" aria-label={error}>!</span>}
 </div>;
}
