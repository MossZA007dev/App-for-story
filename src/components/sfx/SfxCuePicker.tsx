'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Volume2,X,Play,Square,Check,Search,Library,Link2} from 'lucide-react';
import {BUILTIN_CUES,readSfxCue,safeSfxUrl,sourceForCue,type SfxCue,type SfxTrack} from '@/lib/audio/sfxCues';
import {useSfxEngine} from './useSfxEngine';
import './sfx-cues.css';
export function SfxCuePicker({value,tracks,onChange,onOpenVault,blockNumber}:{value?:string;tracks:SfxTrack[];onChange:(value:string)=>void;onOpenVault:()=>void;blockNumber:number}){
 const[open,setOpen]=useState(false),[cue,setCue]=useState<SfxCue>({source:'builtin:door',name:'ประตูปิด',mode:'once',volume:.65,delayMs:0}),[query,setQuery]=useState(''),[custom,setCustom]=useState(''),[previewing,setPreviewing]=useState(false),[message,setMessage]=useState('');const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);const {preview,stop,error}=useSfxEngine(open),saved=readSfxCue(value);
 useEffect(()=>{if(open){setCue(readSfxCue(value)||{source:'builtin:door',name:'ประตูปิด',mode:'once',volume:.65,delayMs:0});setQuery('');setCustom('');setMessage('');setPreviewing(false);dialog.current?.showModal();}},[open]);
 const close=()=>{stop();setPreviewing(false);setOpen(false);trigger.current?.focus();};
 const apply=()=>{if(cue.mode!=='stop'&&!sourceForCue(cue,tracks)){setMessage('เลือกไฟล์เสียงหรือเสียงสำเร็จรูปก่อนครับ');return;}onChange(JSON.stringify(cue));close();};
 const filtered=tracks.filter(t=>t.category!=='music'&&t.name.toLowerCase().includes(query.toLowerCase()));
 return <>
  <button ref={trigger} type="button" className={`sfx-cue-pill ${saved?'is-bound':''}`} aria-label={`SFX บทที่ ${blockNumber}${saved?` · ${saved.mode==='stop'?'หยุดเสียง':saved.name}`:''}`} title="ใส่เอฟเฟกต์เสียงโดยไม่เปลี่ยนเพลงหลัก" onClick={event=>{event.stopPropagation();setOpen(true);}}><Volume2 size={13}/><span>{saved?(saved.mode==='stop'?'หยุด SFX':`${saved.name} · ${saved.mode==='loop'?'วน':'ครั้งเดียว'}`):'+ SFX'}</span></button>
  {open&&createPortal(<dialog ref={dialog} className="sfx-cue-overlay" aria-labelledby={`sfx-heading-${blockNumber}`} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{event.stopPropagation();if(event.target===event.currentTarget)close();}}>
   <div className="sfx-cue-dialog"><header><div><small>SOUND EFFECTS · บทที่ {blockNumber}</small><h2 id={`sfx-heading-${blockNumber}`}>เติมเสียงให้จังหวะของเรื่อง</h2><p>SFX เล่นทับเพลงหลักได้ โดยไม่เปลี่ยนเพลงของ SS / EP</p></div><button aria-label="ปิดเลือก SFX" type="button" onClick={close}><X size={20}/></button></header>
   <div className="sfx-cue-body">
    <div className="sfx-cue-modes" role="group" aria-label="วิธีเล่น SFX">{([['once','เล่นครั้งเดียว'],['loop','เล่นวนต่อเนื่อง'],['stop','หยุด SFX']] as const).map(([mode,label])=><button type="button" key={mode} aria-pressed={cue.mode===mode} onClick={()=>{stop();setPreviewing(false);setCue({...cue,mode});}}>{label}</button>)}</div>
    {cue.mode==='stop'?<p className="sfx-cue-note">เมื่ออ่านถึงบทนี้ จะหยุดเสียงเอฟเฟกต์ที่ค้างอยู่ เพลงหลักยังเล่นตามเดิม</p>:<>
     <label className="sfx-cue-search"><Search size={15}/><input aria-label="ค้นหา SFX" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาเสียงในคลัง…"/></label>
     <h3>เสียงสำเร็จรูป · ฟรีในเครื่อง</h3><div className="sfx-cue-presets">{BUILTIN_CUES.filter(b=>b.name.includes(query)).map(b=><button type="button" key={b.id} aria-pressed={cue.source===`builtin:${b.id}`} onClick={()=>{stop();setPreviewing(false);setCue({...cue,source:`builtin:${b.id}`,name:b.name});}}><Volume2 size={15}/>{b.name}{cue.source===`builtin:${b.id}`&&<Check size={13}/>}</button>)}</div>
     <div className="sfx-cue-list-heading"><h3>จากคลังเสียงของเรื่อง</h3><button type="button" onClick={()=>{close();onOpenVault();}}><Library size={14}/>เพิ่มเสียงในคลัง</button></div>
     <div className="sfx-cue-library">{filtered.length?filtered.map(t=><button type="button" key={t.id} disabled={!safeSfxUrl(t.audioUrl)} title={!safeSfxUrl(t.audioUrl)?'SFX ต้องใช้ไฟล์เสียงโดยตรง ใช้ YouTube เป็นเพลงพื้นหลังได้':t.name} aria-pressed={cue.source===`sfx:${t.id}`} onClick={()=>{stop();setPreviewing(false);setCue({...cue,source:`sfx:${t.id}`,name:t.name});}}><Volume2 size={16}/><span>{t.name}</span>{cue.source===`sfx:${t.id}`&&<Check size={14}/>}</button>):<p>ยังไม่มีเสียงที่ตรงกับการค้นหา เลือกเสียงสำเร็จรูปหรือเพิ่มเสียงในคลังได้</p>}</div>
     <details className="sfx-cue-url"><summary><Link2 size={14}/>ใช้ลิงก์ไฟล์เสียง</summary><div><input aria-label="ลิงก์ไฟล์ SFX" placeholder="https://…/sound.mp3" value={custom} onChange={e=>setCustom(e.target.value)}/><button type="button" onClick={()=>{if(!safeSfxUrl(custom.trim())){setMessage('ใช้ลิงก์ไฟล์เสียงโดยตรง ไม่รองรับ YouTube สำหรับ SFX');return;}setCue({...cue,source:`url:${custom.trim()}`,name:'SFX จากลิงก์'});setMessage('');}}>เลือก</button></div></details>
     <label className="sfx-cue-field">ชื่อเสียง<input value={cue.name} maxLength={160} onChange={e=>setCue({...cue,name:e.target.value})}/></label>
     <div className="sfx-cue-settings"><label>ความดัง <output>{Math.round(cue.volume*100)}%</output><input aria-label="ความดังเสียงนี้" type="range" min="0" max="100" value={Math.round(cue.volume*100)} onChange={e=>setCue({...cue,volume:Number(e.target.value)/100})}/></label><label>หน่วงเวลา <output>{cue.delayMs/1000} วินาที</output><input aria-label="หน่วงเวลา SFX" type="range" min="0" max="5000" step="100" value={cue.delayMs} onChange={e=>setCue({...cue,delayMs:Number(e.target.value)})}/></label></div>
     <button className="sfx-cue-preview" type="button" onClick={()=>{if(previewing){stop();setPreviewing(false);}else{preview(cue,tracks);setPreviewing(true);}}}>{previewing?<Square size={15}/>:<Play size={15}/>} {previewing?'หยุดตัวอย่าง':'ฟังตัวอย่างเสียง'}</button>
     <p className="sfx-cue-note">{cue.mode==='loop'?'เสียงนี้จะวนต่อเนื่อง ใส่ “หยุด SFX” ที่บทปลายทาง หรือเปลี่ยนฉากเพื่อหยุด':'เล่นเมื่ออ่านมาถึงบทนี้ครั้งแรก ย้อนอ่านจะไม่เล่นซ้ำรัว ๆ'} · เปิด SFX ในหน้าอ่านเพื่อฟัง</p>
    </>}
    {(message||error)&&<p className="sfx-cue-error" role="alert">{message||error}</p>}
   </div><footer><button type="button" className="sfx-cue-remove" disabled={!saved} onClick={()=>{onChange('');close();}}>นำ SFX ออกจากบท</button><button type="button" className="sfx-cue-save" onClick={apply}><Check size={16}/>ใช้กับบทนี้</button></footer></div>
  </dialog>,document.body)}
 </>;
}
