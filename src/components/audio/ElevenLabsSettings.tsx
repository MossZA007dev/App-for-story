"use client";
import {useEffect,useState} from "react";
export function ElevenLabsSettings() {
  const [configured,setConfigured]=useState(false),[key,setKey]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/narration/settings").then(r=>r.json()).then(data=>setConfigured(data.configured)).catch(()=>setMessage("ตรวจการตั้งค่าไม่สำเร็จ"));},[]);
  const save=async()=>{
    setBusy(true);setMessage("");
    try {const response=await fetch("/api/narration/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:key})});const data=await response.json();if(!response.ok) throw new Error(data.error);setConfigured(true);setKey("");setMessage("บันทึกแล้ว ไปหน้าอ่านเพื่อเลือกเสียงและทดลองพากย์ได้เลย");}
    catch(error) {setMessage(error instanceof Error ? error.message:"บันทึกไม่สำเร็จ");}finally{setBusy(false);}
  };
  return <section className="cinematic-card rounded-xl p-5 border-slate-800 bg-slate-900/50 space-y-3" aria-labelledby="eleven-settings-title">
    <h2 id="eleven-settings-title" className="text-lg font-semibold text-slate-100">เสียงพากย์ ElevenLabs</h2>
    <p className="text-sm text-slate-300">ใช้เสียงสำเร็จรูปภาษาไทย ทดลองข้อความสั้นก่อนสร้างทั้งฉาก รองรับบัญชี Free และ Starter โดยหยุดเมื่อเครดิตในแพ็กเกจไม่พอ</p>
    <p className="text-sm text-amber-300">{configured ? "มี API Key พร้อมใช้งานแล้ว":"ยังไม่ได้ตั้งค่า API Key"}</p>
    <label htmlFor="eleven-api-key" className="block text-sm text-slate-200">ElevenLabs API Key</label>
    <input id="eleven-api-key" type="password" autoComplete="new-password" onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();if(!busy && key.trim().length>=10) void save();}}} value={key} disabled={busy} onChange={e=>setKey(e.target.value)} placeholder={configured ? "กรอกเฉพาะเมื่อต้องการเปลี่ยนคีย์":"ใส่คีย์จากบัญชี ElevenLabs ของคุณ"} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100"/>
    <div className="flex flex-wrap gap-3 items-center"><button type="button" className="reader-primary" disabled={busy || key.trim().length<10} onClick={save}>{busy ? "กำลังบันทึก…":"บันทึกคีย์เสียงพากย์"}</button><a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noreferrer" className="text-sm text-amber-300 underline">เปิดหน้าสร้าง API Key</a></div>
    <p className="text-xs text-slate-400">เปิดสิทธิ์ Text to Speech, Voices, Models และ User สำหรับตรวจเครดิต คีย์จะไม่แสดงกลับในหน้าเว็บ</p>
    {message && <p role="status" className="text-sm text-slate-200">{message}</p>}
  </section>;
}
