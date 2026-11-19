'use client';
import {useEffect,useRef,useState} from 'react';
import {parseStoryStructure,StoryStructure} from '@/lib/story/structuredImport';
interface Props {isOpen:boolean;onClose:()=>void;characters:any[];activePartTitle?:string;currentSceneTitle?:string;onApplySingleScene:(text:string)=>Promise<void>;onApplyMultiScenes?:(text:string)=>Promise<void>;projectId?:string;onBeforeImport?:()=>Promise<void>;onImported?:(result:{firstSceneId:string;partId:string;episodeId:string})=>Promise<void>;}
export function MasterStoryImportModal(props:Props){
 const [text,setText]=useState(''),[draft,setDraft]=useState<StoryStructure|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),flight=useRef(false),request=useRef('');
 useEffect(()=>{if(props.isOpen){dialog.current?.showModal();request.current=crypto.randomUUID();}else dialog.current?.close();},[props.isOpen]);
 useEffect(()=>{try{setDraft(text.trim()?parseStoryStructure(text,props.activePartTitle||'ภาคใหม่'):null);setError('');}catch(e){setDraft(null);setError(e instanceof Error?e.message:'อ่านโครงสร้างไม่สำเร็จ');}},[text,props.activePartTitle]);
 const mutate=(fn:(d:StoryStructure)=>void)=>{if(!draft)return;const copy=structuredClone(draft);fn(copy);setDraft(copy);};
 const submit=async(single=false)=>{if(flight.current||!draft)return;flight.current=true;setBusy(true);setError('');try{
  if(single){await props.onApplySingleScene(text);props.onClose();return;}
  await props.onBeforeImport?.();
  const response=await fetch(`/api/projects/${props.projectId}/import-structure`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:request.current,structure:draft})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'นำเข้าไม่สำเร็จ');
  await props.onImported?.(data);setText('');props.onClose();
 }catch(e){setError(e instanceof Error?e.message:'นำเข้าไม่สำเร็จ');}finally{flight.current=false;setBusy(false);}};
 const eps=draft?.parts.flatMap(p=>p.episodes)||[],sceneCount=eps.reduce((n,e)=>n+e.scenes.length,0);
 return <dialog ref={dialog} className="story-structure-dialog" aria-labelledby="paste-story-heading" onCancel={e=>{if(busy)e.preventDefault();else props.onClose();}}>
 <header><div><h2 id="paste-story-heading">นำเข้าทั้งภาค (Master)</h2><p>แยกภาค → EP → ฉาก พร้อมบทพูดให้อัตโนมัติ ไม่ใช้เครดิต AI</p></div><button type="button" aria-label="ปิดหน้านำเข้าบท" disabled={busy} onClick={props.onClose}>✕</button></header>
 <div className="structure-body"><label htmlFor="story-paste">เนื้อเรื่องที่คัดลอกมา</label><textarea id="story-paste" value={text} disabled={busy} maxLength={160000} rows={8} onChange={e=>{setText(e.target.value);request.current=crypto.randomUUID();}} placeholder={'วางจาก ChatGPT หรือ AI ได้เลย ทั้งข้อความธรรมดาและ Markdown\n\nปีที่ 3: The Prisoner and the Promise\nฉากที่ 1: ความเย็นที่กินความทรงจำ\nสถานที่: Hogwarts Express\nMoss: เราจะไม่ทิ้งใครไว้ข้างหลัง'} />
 {draft&&<><div className="structure-counts">{draft.parts.length} ภาค · {eps.length} EP · {sceneCount} ฉาก</div><p className="structure-hint">ตรวจและแก้ชื่อได้ด้านล่าง หัวข้อที่มีอยู่จะใช้ชื่อต้นฉบับ หากไม่มี EP แต่ละฉากจะกลายเป็น 1 EP บทเกริ่นเก็บในสรุป EP</p>
 <div className="structure-preview">{draft.parts.map((p,pi)=><section key={pi}><label>ชื่อภาค<input aria-label={`ชื่อภาคนำเข้า ${pi+1}`} disabled={busy} value={p.title} maxLength={500} onChange={e=>mutate(d=>{d.parts[pi].title=e.target.value;})}/></label>
 {p.episodes.map((ep,ei)=><div className="structure-episode" key={ei}><label>EP {ei+1} {ep.inferred&&<small>· สร้างจากฉาก</small>}<input aria-label={`ชื่อ EP ${pi+1}-${ei+1}`} disabled={busy} value={ep.title} maxLength={500} onChange={e=>mutate(d=>{d.parts[pi].episodes[ei].title=e.target.value;})}/></label>
 {ep.summary&&<details><summary>บทเกริ่น / สรุปตอน ({ep.summary.length.toLocaleString()} ตัวอักษร)</summary><div className="structure-prose">{ep.summary}</div></details>}
 {ep.scenes.map((sc,si)=><details key={si}><summary><span>ฉาก {si+1} · {sc.title}</span><small>{sc.contentMarkdown.length.toLocaleString()} ตัวอักษร</small></summary><label>ชื่อฉาก<input aria-label={`ชื่อฉาก ${pi+1}-${ei+1}-${si+1}`} value={sc.title} disabled={busy} maxLength={500} onChange={e=>mutate(d=>{d.parts[pi].episodes[ei].scenes[si].title=e.target.value;})}/></label><label>สถานที่<input value={sc.location} disabled={busy} maxLength={1000} onChange={e=>mutate(d=>{d.parts[pi].episodes[ei].scenes[si].location=e.target.value;})}/></label><div className="structure-prose">{sc.contentMarkdown}</div></details>)}
 </div>)}
 </section>)}</div></>}
 {error&&<p role="alert" className="structure-error">{error}</p>}</div>
 <footer><p>เพิ่มเป็นภาคใหม่ ไม่ทับหรือลบฉากเดิม หากเลขภาคซ้ำจะใช้เลขถัดไป</p><div><button type="button" disabled={busy} onClick={props.onClose}>ยกเลิก</button><button className="structure-primary" type="button" disabled={busy||!draft||!props.projectId} onClick={()=>submit()}>{busy?'กำลังนำเข้า…':`สร้างโครงสร้างและนำเข้า${sceneCount?` ${sceneCount} ฉาก`:''}`}</button></div></footer>
 </dialog>;
}
