"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Sparkles,Loader2,X,Check,Image as ImageIcon} from "lucide-react";
type Character={id:string;name:string;realNickname?:string|null;avatarUrl?:string|null};
type Props={projectId:string;sceneId:string;title:string;location:string;content:string;characters:Character[];defaultCharacterIds:string[];onClose:()=>void;onCreated:(image:any,sceneId:string)=>void};
export function OpenAISceneImageDialog({projectId,sceneId,title,location,content,characters,defaultCharacterIds,onClose,onCreated}:Props){
 const dialog=useRef<HTMLDialogElement|null>(null),inFlight=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[configured,setConfigured]=useState<boolean|null>(null);
 const [aspect,setAspect]=useState<'16:9'|'1:1'|'9:16'>('16:9'),[direction,setDirection]=useState(''),[useReferences,setUseReferences]=useState(true),[manual,setManual]=useState(false),[selected,setSelected]=useState(defaultCharacterIds.slice(0,16));
 useEffect(()=>{const element=dialog.current,previous=document.body.style.overflow;element?.showModal();document.body.style.overflow='hidden';let active=true;fetch('/api/openai-story/settings').then(r=>r.json()).then(data=>{if(active)setConfigured(data.configured);}).catch(()=>{});return()=>{active=false;element?.close();document.body.style.overflow=previous;};},[]);
 const generate=async()=>{
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  try{
   const response=await fetch(`/api/projects/${projectId}/scenes/${sceneId}/image`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content,title,location,direction,aspect,useReferences,...(manual?{characterIds:selected}:{})}),signal:AbortSignal.timeout(360000)});
   const data=await response.json();if(!response.ok)throw new Error(data.error || 'สร้างภาพไม่สำเร็จ');if(!data.image?.id)throw new Error('ไม่ได้รับภาพที่สมบูรณ์');onCreated(data.image,sceneId);
  }catch(error){setError(error instanceof Error&&error.name==='TimeoutError'?'รอผลนานเกินไป กรุณาตรวจคลังภาพก่อนกดสร้างซ้ำ':error instanceof Error?error.message:'สร้างภาพฉากไม่สำเร็จ');}
  finally{inFlight.current=false;setBusy(false);}
 };
 return <dialog ref={dialog} className="scene-image-dialog" aria-labelledby="scene-image-title" onCancel={event=>{event.preventDefault();if(!inFlight.current)onClose();}}>
  <header><div><h2 id="scene-image-title"><Sparkles size={21}/>สร้างภาพจากฉาก</h2><p>OpenAI อ่านบท เลือกตัวละคร และจัดภาพให้โดยอัตโนมัติ</p></div><button type="button" aria-label="ปิดหน้าสร้างภาพ" onClick={onClose} disabled={busy}><X size={20}/></button></header>
  <div className="scene-image-body"><div className="scene-image-context"><ImageIcon size={22}/><div><strong>{title || 'ฉากปัจจุบัน'}</strong><p>{location || 'ใช้สถานที่จากบท'} · {content.length.toLocaleString()} ตัวอักษร</p></div></div>
   <p className="scene-image-help">กดสร้างภาพได้เลย ระบบจะวิเคราะห์บทปัจจุบัน เตรียมคำอธิบายภาพ และเพิ่มภาพที่สร้างเข้าฉากนี้ให้</p>
   {configured===false&&<p><Link href="/settings" className="underline">ตั้งค่า OpenAI API Key</Link> ก่อนสร้างภาพ ใช้คีย์เดียวกับผู้ช่วยเขียนได้</p>}
   <fieldset disabled={busy}><legend>สัดส่วนภาพ</legend><div className="scene-image-aspects" role="group" aria-label="สัดส่วนภาพฉาก">{(['16:9','1:1','9:16'] as const).map(value=><button key={value} type="button" aria-pressed={aspect===value} onClick={()=>setAspect(value)}><span className={`aspect-outline aspect-${value.replace(':','-')}`}/><strong>{value}</strong><span>{value==='16:9'?'แนวนอน cinematic':value==='1:1'?'จัตุรัส':'แนวตั้ง'}</span>{aspect===value&&<Check size={14}/>}</button>)}</div>
   <details className="scene-image-advanced"><summary>ปรับรายละเอียดเพิ่มเติม <span>ไม่จำเป็นต้องกรอก</span></summary><label>อยากเน้นอะไรในภาพ?<textarea aria-label="รายละเอียดเพิ่มเติมของภาพฉาก" rows={3} maxLength={3000} value={direction} onChange={event=>setDirection(event.target.value)} placeholder="เช่น โฟกัสสายตาของ Moss บรรยากาศมืดสงบ มุมกล้องกว้าง"/></label>
    <label className="scene-image-check"><input type="checkbox" checked={useReferences} onChange={event=>setUseReferences(event.target.checked)}/>ใช้ภาพโปรไฟล์ช่วยรักษาลักษณะตัวละคร</label>
    <p className="scene-image-help">ใช้เฉพาะภาพของตัวละครที่ AI พบในฉาก ไม่ดึงทุกคนมาใส่พร้อมกัน ภาพใบหน้าอาจแตกต่างจากต้นฉบับได้</p>
    <label className="scene-image-check"><input type="checkbox" checked={manual} onChange={event=>setManual(event.target.checked)}/>เลือกตัวละครในภาพเอง</label>
    {manual&&<div className="scene-image-cast">{characters.map(character=><button key={character.id} type="button" disabled={!selected.includes(character.id)&&selected.length>=16} aria-pressed={selected.includes(character.id)} onClick={()=>setSelected(previous=>previous.includes(character.id)?previous.filter(id=>id!==character.id):[...previous,character.id])}>{character.avatarUrl?<img src={character.avatarUrl} alt=""/>:<span className="scene-image-avatar">{character.name.slice(0,1)}</span>}<span>{character.realNickname || character.name}</span>{selected.includes(character.id)&&<Check size={15}/>}</button>)}<p className="scene-image-help">เลือก {selected.length}/16 คน · ไม่เลือกใครเพื่อสร้างภาพบรรยากาศ</p></div>}
   </details></fieldset>
   {busy&&<div className="scene-image-working" role="status"><Loader2 size={20} className="animate-spin"/><div><strong>กำลังวิเคราะห์บทและสร้างภาพ…</strong><p>เมื่อเสร็จจะเพิ่มภาพเข้าฉากให้อัตโนมัติ อาจใช้เวลาสักครู่</p></div></div>}
   {error&&<p className="scene-image-error" role="alert">{error}</p>}
  </div><footer><p>ใช้เครดิต OpenAI สำหรับวิเคราะห์บทและสร้างภาพ{useReferences?' โดยส่งภาพอ้างอิงที่เกี่ยวข้องด้วย':''}</p><div><button type="button" className="workspace-secondary" onClick={onClose} disabled={busy}>ยกเลิก</button><button type="button" className="reader-primary" disabled={busy||configured===false||!content.trim()||!sceneId} onClick={generate}>{busy?<Loader2 size={17} className="animate-spin"/>:<Sparkles size={17}/>} {busy?'กำลังสร้างภาพ…':'สร้างภาพฉาก'}</button></div></footer>
 </dialog>;
}
