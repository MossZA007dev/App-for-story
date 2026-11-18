"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {Sparkles,ScanText,Loader2,Check} from "lucide-react";
type Props={projectId:string;sceneId:string;content:string;title:string;location:string;onApply:(text:string)=>Promise<void>};
export function OpenAISceneAssistant({projectId,sceneId,content,title,location,onApply}:Props){
 const [direction,setDirection]=useState(""),[words,setWords]=useState(1000),[analysis,setAnalysis]=useState(""),[draft,setDraft]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState<"analyze"|"generate"|"apply"|null>(null),[configured,setConfigured]=useState<boolean|null>(null),[status,setStatus]=useState("");
 const revision=JSON.stringify({content,title,location});
 const controller=useRef<AbortController|null>(null),inFlight=useRef(false),mounted=useRef(true),snapshot=useRef(""),latest=useRef(revision);latest.current=revision;
 useEffect(()=>{mounted.current=true;fetch('/api/openai-story/settings').then(r=>r.json()).then(data=>{if(mounted.current)setConfigured(data.configured);}).catch(()=>{});return()=>{mounted.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{setAnalysis("");},[revision]);
 const run=async(action:"analyze"|"generate")=>{
  if(inFlight.current)return;inFlight.current=true;setBusy(action);setError("");setStatus("");const source=content;const sourceRevision=revision;controller.current=new AbortController();
  try{
   const response=await fetch(`/api/projects/${projectId}/scenes/${sceneId}/assistant`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.current.signal,body:JSON.stringify({action,content:source,title,location,targetWords:words,direction:direction+(action==='generate'&&analysis?'\nใช้ข้อเสนอวิเคราะห์นี้เป็นแนวทาง ไม่ใช่ข้อเท็จจริงใหม่:\n'+analysis.slice(0,2500):'')})});
   const data=await response.json();if(!response.ok)throw new Error(data.error || 'AI ทำงานไม่สำเร็จ');if(!mounted.current)return;
   if(action==='analyze'){if(latest.current!==sourceRevision){setError('บทเปลี่ยนระหว่างวิเคราะห์ กรุณาวิเคราะห์จากบทล่าสุดอีกครั้ง');return;}setAnalysis(data.text);setStatus('วิเคราะห์เสร็จแล้ว ใช้คำแนะนำนี้ประกอบการสร้างฉากได้');}
   else {setDraft(data.text);snapshot.current=sourceRevision;setStatus('สร้างฉบับร่างแล้ว ตรวจและแก้ไขก่อนนำไปใช้ในฉาก');}
  }catch(error){if(mounted.current)setError(error instanceof Error&&error.name==='AbortError'?'ยกเลิกการรอแล้ว เนื้อหาเดิมยังอยู่':error instanceof Error?error.message:'เรียก AI ไม่สำเร็จ');}
  finally{inFlight.current=false;if(mounted.current)setBusy(null);}
 };
 const apply=async()=>{if(inFlight.current || !draft.trim())return;if(snapshot.current!==latest.current){setError('บทในห้องเขียนเปลี่ยนหลังจากสร้างร่างแล้ว กรุณาคัดลอกร่างเก็บไว้หรือสร้างใหม่ เพื่อไม่ทับงานล่าสุด');return;}inFlight.current=true;setBusy('apply');setError('');try{await onApply(draft);setDraft('');setStatus('นำฉบับร่างไปใช้ในห้องเขียนแล้ว');}catch{setError('นำบทไปใช้ไม่สำเร็จ ฉบับร่างยังอยู่ให้คัดลอกได้');}finally{inFlight.current=false;if(mounted.current)setBusy(null);}};
 return <details className="openai-scene-assistant"><summary><Sparkles size={16}/>OpenAI · วิเคราะห์และสร้างฉาก</summary><div className="openai-assistant-body">
  <p className="text-sm text-slate-400">อ้างอิงจักรวาล ตัวละคร กฎเรื่อง และบริบทก่อนหน้า พร้อมอ่านบทที่กำลังแก้ไขอยู่</p>
  {configured===false&&<p className="text-sm"><Link className="underline" href="/settings">ตั้งค่า OpenAI API Key</Link> ก่อนเริ่มใช้งาน</p>}
  <label>อยากให้ฉากนี้เป็นอย่างไร?<textarea aria-label="คำสั่งสร้างฉากด้วย OpenAI" rows={3} maxLength={3000} value={direction} disabled={Boolean(busy)} onChange={e=>setDirection(e.target.value)} placeholder="เช่น วิเคราะห์ว่าบทพูดสมบุคลิกไหม แล้วเขียนฉากเผชิญหน้าให้ตึงเครียดขึ้น โดยไม่เปลี่ยนเหตุการณ์หลัก"/></label>
  <label>ความยาวเป้าหมาย<select aria-label="ความยาวฉากจาก OpenAI" value={words} disabled={Boolean(busy)} onChange={e=>setWords(Number(e.target.value))}>{[500,1000,1500,2000].map(n=><option key={n} value={n}>ประมาณ {n.toLocaleString()} คำ</option>)}</select></label>
  <div className="openai-assistant-actions"><button type="button" className="workspace-secondary" disabled={Boolean(busy)||configured===false||!content.trim()||!sceneId} onClick={()=>run('analyze')}><ScanText size={15}/>วิเคราะห์ฉากและบทพูด</button><button type="button" className="reader-primary" disabled={Boolean(busy)||configured===false||!sceneId} onClick={()=>run('generate')}>{busy==='generate'?<Loader2 size={15} className="animate-spin"/>:<Sparkles size={15}/>}สร้างฉากด้วย OpenAI</button>{busy&&busy!=='apply'&&<button type="button" className="workspace-text-link" onClick={()=>controller.current?.abort()}>ยกเลิกการรอ</button>}</div>
  <p className="text-xs text-slate-400">เมื่อกดวิเคราะห์หรือสร้าง ระบบจะส่งบทและบริบทเรื่องไป OpenAI และใช้เครดิต API ผลลัพธ์ยังไม่แทนบทเดิมจนกดนำไปใช้</p>
  {analysis&&<details className="openai-analysis" open><summary>ผลวิเคราะห์ฉากและบทพูด</summary><div className="prose prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown></div></details>}
  {draft&&<div className="openai-draft"><label>ฉบับร่างที่สร้าง — แก้ไขได้<textarea aria-label="ฉบับร่างฉากจาก OpenAI" rows={12} value={draft} onChange={e=>setDraft(e.target.value)} disabled={Boolean(busy)}/></label>{snapshot.current!==revision&&<p className="text-sm text-slate-300">บทเดิมมีการเปลี่ยนแปลงแล้ว ป้องกันการนำร่างนี้ไปทับงานล่าสุด</p>}<button type="button" className="reader-primary" disabled={Boolean(busy)||!draft.trim()||snapshot.current!==revision} onClick={apply}><Check size={16}/>นำฉบับร่างนี้ไปใช้ในฉาก</button></div>}
  {busy&&<p role="status" className="text-sm">{busy==='analyze'?'กำลังวิเคราะห์บริบทและบทพูด…':busy==='generate'?'กำลังสร้างฉาก…':'กำลังนำบทไปใช้…'}</p>}{status&&<p role="status" className="text-sm">{status}</p>}{error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
 </div></details>;
}
