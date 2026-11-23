'use client';
import {useEffect,useState} from 'react';
import {Volume2,VolumeX,RotateCcw,Settings2} from 'lucide-react';
import {readSfxCue,type SfxTrack} from '@/lib/audio/sfxCues';
import {VolumeControl} from '@/components/audio/VolumeControl';
import {useSfxEngine} from './useSfxEngine';
import './sfx-cues.css';
type PlaybackProps={sceneId:string;index:number;bindings:Record<string,string>;tracks:SfxTrack[];active?:boolean};
export function useSfxPlaybackController({sceneId,index,bindings,tracks,active=true}:PlaybackProps){
 const {engine,error,clearError}=useSfxEngine();const[enabled,setEnabled]=useState(false),[volume,setVolume]=useState(.7),[ready,setReady]=useState(false);
 const signature=JSON.stringify(bindings),library=JSON.stringify(tracks),cue=readSfxCue(bindings[`sfx_${index}`]);
 const count=Object.entries(bindings).filter(([key,value])=>/^sfx_\d+$/.test(key)&&readSfxCue(value)).length;
 useEffect(()=>{try{const saved=Number(localStorage.getItem('saga-sfx-volume'));if(localStorage.getItem('saga-sfx-volume')!==null&&Number.isFinite(saved))setVolume(Math.max(0,Math.min(1,saved)));}catch{}setReady(true);},[]);
 useEffect(()=>{engine.current?.setVolume(volume);if(ready)try{localStorage.setItem('saga-sfx-volume',String(volume));}catch{}},[volume,ready]);
 useEffect(()=>{if(enabled&&active&&sceneId)engine.current?.visit(sceneId,index,JSON.parse(signature),JSON.parse(library));else engine.current?.reset();},[enabled,active,sceneId,index,signature,library]);
 useEffect(()=>{if(!active)setEnabled(false);},[active]);
 useEffect(()=>{const hide=()=>{if(document.hidden){engine.current?.reset();setEnabled(false);}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 return {enabled,volume,error,cue,count,active,sceneId,index,setVolume,toggle:()=>{clearError();setEnabled(!enabled);},replay:()=>{if(cue){clearError();engine.current?.preview(cue,tracks);}}};
}
type Controller=ReturnType<typeof useSfxPlaybackController>;
export function SfxPlaybackPanel({controller:c}:{controller:Controller}){
 return <section className="ir-sfx-card" aria-label="เอฟเฟกต์ตามบท SFX"><div className="ir-sfx-heading"><span><strong>เอฟเฟกต์ตามบท · SFX</strong><small>{c.count?`ฉากนี้มีจุดเสียง ${c.count} จุด`:'ฉากนี้ยังไม่มี SFX ผูกไว้'}</small></span><button type="button" aria-label={c.enabled?'ปิด SFX ตามบท':'เปิด SFX ตามบท'} aria-pressed={c.enabled} disabled={!c.active||!c.sceneId} onClick={c.toggle}>{c.enabled?<Volume2 size={19}/>:<VolumeX size={19}/>}</button></div>
  <VolumeControl label="ความดัง SFX" value={c.volume*100} onChange={value=>c.setVolume(value/100)} status={c.enabled?'เปิดอยู่':'ปิดเสียง'}/>
  <div className="ir-sfx-current"><span>บทที่ {c.index+1}</span><strong>{c.cue?(c.cue.mode==='stop'?'จุดหยุด SFX':c.cue.name):'ไม่มีเสียงใหม่ในบทนี้'}</strong></div>
  <button type="button" className="ir-sfx-replay" disabled={!c.enabled||!c.cue} onClick={c.replay}><RotateCcw size={14}/>{c.cue?.mode==='stop'?'ทดสอบจุดหยุด SFX':'เล่น SFX บทนี้อีกครั้ง'}</button>
  <p>เสียงครั้งเดียวจะไม่เล่นซ้ำเมื่อย้อนบท เสียงวนหยุดเมื่อถึงจุดหยุดหรือเปลี่ยนฉาก</p>{c.error&&<p className="ir-sfx-error" role="alert">{c.error}</p>}
 </section>;
}
export function SfxPlaybackControls(props:PlaybackProps){const c=useSfxPlaybackController(props);
 return <div className="sfx-playback"><button type="button" aria-label={c.enabled?'ปิด SFX ตามบท':'เปิด SFX ตามบท'} aria-pressed={c.enabled} disabled={!c.active||!c.sceneId} title="เปิดเอฟเฟกต์ตามจังหวะบท โดยไม่เปลี่ยนเพลง SS/EP" onClick={c.toggle}>{c.enabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>SFX</span></button>
  <details className="sfx-playback-options"><summary aria-label="ตั้งค่าและทดสอบ SFX"><Settings2 size={14}/></summary><div><VolumeControl label="ความดัง SFX" value={c.volume*100} onChange={value=>c.setVolume(value/100)}/><button type="button" disabled={!c.enabled||!c.cue} onClick={c.replay}><RotateCcw size={14}/>เล่น SFX บทนี้อีกครั้ง</button><small>ย้อนบทจะไม่เล่นเสียงครั้งเดียวซ้ำเอง เสียงวนหยุดเมื่อเจอจุดหยุดหรือเปลี่ยนฉาก</small>{c.error&&<p role="alert">{c.error}</p>}</div></details>
  {c.error&&<span className="sfx-error-dot" title={c.error} role="status" aria-label={c.error}>!</span>}
 </div>;
}
