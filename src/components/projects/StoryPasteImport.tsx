"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Sparkles, ArrowLeft, Plus, Trash2, Check, Loader2, ChevronRight } from "lucide-react";
import { MAX_IMPORT_TEXT, parseStoryImport, type StoryImportDraft, type ImportedCharacter } from "@/lib/story/storyImport";

/** Keep table structure when copying the rendered response, without injecting HTML. */
function clipboardText(event: ClipboardEvent<HTMLTextAreaElement>) {
  const html=event.clipboardData.getData("text/html");
  const fallback=event.clipboardData.getData("text/plain");
  if (!html) return fallback;
  const doc=new DOMParser().parseFromString(html,"text/html");
  if (!doc.querySelector("table")) return fallback;
  doc.querySelectorAll("script,style,noscript").forEach(node=>node.remove());
  doc.querySelectorAll("table").forEach(table=>{
    const rows=Array.from(table.querySelectorAll("tr")).map(row=>"| "+Array.from(row.querySelectorAll("th,td")).map(cell=>(cell.textContent || "").trim().replace(/\|/g,"\\|").replace(/\s+/g," ")).join(" | ")+" |");
    table.replaceWith(doc.createTextNode("\n\n"+rows.join("\n")+"\n\n"));
  });
  doc.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(node=>node.replaceWith(doc.createTextNode("\n\n"+"#".repeat(Number(node.tagName[1]))+" "+node.textContent+"\n\n")));
  doc.querySelectorAll("br").forEach(node=>node.replaceWith(doc.createTextNode("\n")));
  doc.querySelectorAll("p,li").forEach(node=>node.append(doc.createTextNode("\n\n")));
  return doc.body.textContent?.trim() || fallback;
}

export function StoryPasteImport() {
  const router=useRouter();
  const [text,setText]=useState("");
  const [draft,setDraft]=useState<StoryImportDraft|null>(null);
  const [warnings,setWarnings]=useState<string[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [creating,setCreating]=useState(false);
  const requestId=useRef("");
  const inFlight=useRef(false);
  const update=(change:Partial<StoryImportDraft>)=>{requestId.current=crypto.randomUUID();setDraft(prev=>prev ? {...prev,...change}:prev);};
  const updateCharacter=(index:number,change:Partial<ImportedCharacter>)=>{
    if (draft) update({characters:draft.characters.map((c,i)=>i===index ? {...c,...change}:c)});
  };
  const analyse=async(useAI=false)=>{
    if (!text.trim() || busy) return;
    setBusy(true); setError("");
    try {
      let result: {draft:StoryImportDraft;warnings:string[]};
      if (useAI) {
        const response=await fetch("/api/projects/import/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,useAI:true}),signal:AbortSignal.timeout(65000)});
        const data=await response.json();
        if (!response.ok) throw new Error(data.error || "แยกข้อมูลไม่สำเร็จ");
        result=data;
      } else result=parseStoryImport(text);
      requestId.current=crypto.randomUUID(); setDraft(result.draft);setWarnings(result.warnings);
    } catch(err) {setError(err instanceof Error && err.name!=="ZodError" ? err.message:"อ่านรูปแบบข้อความไม่สำเร็จ ลองใช้ AI ช่วยแยกหรือแบ่งข้อความให้สั้นลง");}
    finally {setBusy(false);}
  };
  const create=async()=>{
    if (!draft || inFlight.current) return;
    setError("");setCreating(true);inFlight.current=true;
    try {
      const response=await fetch("/api/projects/import/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:requestId.current,sourceText:text,draft})});
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || "สร้างเรื่องไม่สำเร็จ");
      router.push(`/projects/${data.projectId}`);
    } catch(err) {setError(err instanceof Error ? err.message:"สร้างเรื่องไม่สำเร็จ");setCreating(false);inFlight.current=false;}
  };
  const sceneCount=draft?.parts.reduce((n,p)=>n+p.scenes.length,0) || 0;

  return <section className="story-paste-import" aria-labelledby="story-paste-title">
    <header><div className="story-paste-icon"><ClipboardPaste size={22} /></div><div><h2 id="story-paste-title">วางข้อความ แล้วเริ่มเรื่องได้เลย</h2><p>คัดลอกแผนเรื่อง ตารางตัวละคร หรือเนื้อหาจาก ChatGPT และ AI อื่น ๆ มาวางที่นี่</p></div></header>
    {!draft ? <>
      <label className="sr-only" htmlFor="story-paste-source">ข้อความจาก ChatGPT หรือ AI</label>
      <textarea id="story-paste-source" rows={10} maxLength={MAX_IMPORT_TEXT} value={text} onChange={e=>setText(e.target.value)} disabled={busy} onPaste={event=>{
        const value=clipboardText(event);
        if (!value) return;
        event.preventDefault();
        const target=event.currentTarget;
        const next=text.slice(0,target.selectionStart)+value+text.slice(target.selectionEnd);
        if (next.length>MAX_IMPORT_TEXT) {setError("ข้อความยาวเกิน 80,000 ตัวอักษร กรุณาแบ่งนำเข้า");return;}
        setText(next); setError("");
      }} placeholder={'วางข้อความทั้งหมดได้เลย เช่น\nชื่อเรื่อง: …\nจักรวาล: Harry Potter\n\nตัวละคร | House | บุคลิกเริ่มต้น | ความสามารถที่จะพัฒนา\nMoss | Gryffindor | ENTJ | Combat Transfiguration\n\nปีที่ 1: …\nเนื้อเรื่อง…'} />
      <div className="story-paste-source-meta"><span>{text.length.toLocaleString()} / 80,000 ตัวอักษร</span><span>รองรับตาราง ข้อความ และ JSON</span></div>
      <div className="story-paste-actions"><button className="reader-primary" disabled={!text.trim() || busy} onClick={()=>analyse(false)}>{busy ? <Loader2 size={16} className="animate-spin" />:<ClipboardPaste size={16} />} แยกข้อมูลและดูตัวอย่าง</button><button className="workspace-secondary" disabled={!text.trim() || busy} onClick={()=>analyse(true)}><Sparkles size={16} /> ใช้ AI ช่วยแยก</button></div>
      <p className="story-paste-note">แยกจากตารางได้โดยไม่ใช้ API Key ส่วน “ใช้ AI ช่วยแยก” จะส่งข้อความไปยังผู้ให้บริการที่ตั้งค่าไว้ และอาจมีค่าใช้จ่ายตามบริการ</p>
      {busy && <p role="status" className="story-paste-note">กำลังแยกข้อมูล กรุณารอสักครู่…</p>}
    </> : <>
      <div className="story-paste-review-header"><button className="workspace-text-link" disabled={creating} onClick={()=>{setDraft(null);setError("");}}><ArrowLeft size={16} /> แก้ข้อความต้นฉบับ</button><p aria-live="polite">{draft.characters.length} ตัวละคร · {draft.parts.length} ภาค · {sceneCount} ฉาก</p></div>
      <div className="story-paste-warnings" role="status">{warnings.map((warning,i)=><p key={i}>{warning}</p>)}</div>
      <fieldset disabled={creating} className="story-paste-review-fields">
        <div className="story-paste-grid">
          <label>ชื่อเรื่อง *<input value={draft.title} onChange={e=>update({title:e.target.value})} placeholder="ตั้งชื่อเรื่องนี้" required maxLength={500} /></label>
          <label>จักรวาล *<input value={draft.universe} onChange={e=>update({universe:e.target.value})} placeholder="เช่น Harry Potter" required maxLength={500} /></label>
          <label>ช่วงเวลา<input value={draft.timelineScope} onChange={e=>update({timelineScope:e.target.value})} maxLength={500} /></label>
          <label>ธีมของเรื่อง<input value={draft.theme} onChange={e=>update({theme:e.target.value})} maxLength={5000} /></label>
        </div>
        <div className="story-paste-subheading"><h3>ตัวละครที่จะสร้าง</h3><button type="button" className="workspace-text-link" disabled={draft.characters.length>=100} onClick={()=>update({characters:[...draft.characters,{name:"",realNickname:"",characterType:"friend",gender:"",startMbti:"",faction:"",chosenRole:"",background:""}]})}><Plus size={16} /> เพิ่มตัวละคร</button></div>
        <p className="story-paste-note">เลือก “ตัวฉันเอง” ให้ตัวละครของคุณ ตัวละครจากตารางเริ่มต้นเป็นเพื่อน ส่วนผู้พูดเพิ่มเติมแยกเป็นตัวละครต้นฉบับ ตรวจประเภทและแก้ไขได้ก่อนสร้าง</p>
        <div className="story-paste-cast">{draft.characters.map((character,index)=><div className="story-paste-character" key={index}>
          <div className="story-paste-character-title"><span>{index+1}</span><strong>{character.name || "ตัวละครใหม่"}</strong><button type="button" aria-label={`ไม่นำเข้า ${character.name || `ตัวละครที่ ${index+1}`}`} onClick={()=>update({characters:draft.characters.filter((_,i)=>i!==index)})}><Trash2 size={16} /></button></div>
          <div className="story-paste-grid">
            <label>ชื่อในเรื่อง<input value={character.name} onChange={e=>updateCharacter(index,{name:e.target.value})} maxLength={200} /></label>
            <label>ประเภท<select value={character.characterType} onChange={e=>updateCharacter(index,{characterType:e.target.value as ImportedCharacter['characterType']})}><option value="friend">เพื่อน</option><option value="self">ตัวฉันเอง</option><option value="canon">ตัวละครต้นฉบับ</option></select></label>
            <label>ฝ่าย / บ้าน / สังกัด<input value={character.faction} onChange={e=>updateCharacter(index,{faction:e.target.value})} maxLength={500} /></label>
            <label>บุคลิกเริ่มต้น<input value={character.startMbti} onChange={e=>updateCharacter(index,{startMbti:e.target.value})} maxLength={500} /></label>
          </div>
          <details><summary>รายละเอียดเพิ่มเติม</summary><div className="story-paste-grid"><label>ชื่อเล่น<input value={character.realNickname} onChange={e=>updateCharacter(index,{realNickname:e.target.value})} maxLength={500} /></label><label>เพศ<input value={character.gender} onChange={e=>updateCharacter(index,{gender:e.target.value})} maxLength={500} /></label></div><label>บทบาท / แนวทางพัฒนา<input value={character.chosenRole} onChange={e=>updateCharacter(index,{chosenRole:e.target.value})} maxLength={5000} /></label><label>ภูมิหลัง<textarea rows={3} value={character.background} onChange={e=>updateCharacter(index,{background:e.target.value})} maxLength={15000} /></label></details>
        </div>)}</div>
        <div className="story-paste-subheading"><h3>ภาคและเนื้อหาที่จะนำเข้า</h3></div>
        <p className="story-paste-note">เนื้อหาฉากเก็บตรงจากต้นฉบับ บันทึกสิ้นปีและแผนภาคถัดไปแยกไว้ในบันทึกของภาค เปิดแต่ละภาคเพื่อตรวจเนื้อหาและสถานที่</p>
        {draft.parts.map((part,index)=><details className="story-paste-part" key={index}>
          <summary><ChevronRight size={15} /> {part.title} <span>{part.scenes.length ? `${part.scenes.length} ฉาก` : "โครงเรื่อง · ยังไม่มีฉาก"}</span></summary>
          <div className="story-paste-grid">
            <label>ชื่อภาค<input value={part.title} onChange={e=>update({parts:draft.parts.map((p,i)=>i===index ? {...p,title:e.target.value}:p)})} maxLength={500} /></label>
            <label>ช่วงเวลาของภาค<input value={part.scope} onChange={e=>update({parts:draft.parts.map((p,i)=>i===index ? {...p,scope:e.target.value}:p)})} maxLength={500} /></label>
          </div>
          <label>เกริ่นภาคและบันทึกท้ายภาค<textarea rows={5} value={part.notes} onChange={e=>update({parts:draft.parts.map((p,i)=>i===index ? {...p,notes:e.target.value}:p)})} maxLength={MAX_IMPORT_TEXT} /></label>
          {part.scenes.map((scene,sceneIndex)=><div key={sceneIndex}>
            <div className="story-paste-grid">
              <label>ชื่อฉาก<input value={scene.title} onChange={e=>update({parts:draft.parts.map((p,i)=>i===index ? {...p,scenes:p.scenes.map((s,j)=>j===sceneIndex ? {...s,title:e.target.value}:s)}:p)})} maxLength={500} /></label>
              <label>สถานที่<input value={scene.location} onChange={e=>update({parts:draft.parts.map((p,i)=>i===index ? {...p,scenes:p.scenes.map((s,j)=>j===sceneIndex ? {...s,location:e.target.value}:s)}:p)})} maxLength={500} /></label>
            </div>
            <label>เนื้อหา · {scene.contentMarkdown.length.toLocaleString()} ตัวอักษร<textarea rows={6} value={scene.contentMarkdown} onChange={e=>update({parts:draft.parts.map((p,i)=>i===index ? {...p,scenes:p.scenes.map((s,j)=>j===sceneIndex ? {...s,contentMarkdown:e.target.value}:s)}:p)})} maxLength={MAX_IMPORT_TEXT} /></label>
          </div>)}
        </details>)}
        <details className="story-paste-part"><summary>บันทึกโลกและข้อมูลเพิ่มเติม</summary><textarea aria-label="บันทึกโลกที่นำเข้า" rows={5} value={draft.worldNotes} onChange={e=>update({worldNotes:e.target.value})} maxLength={MAX_IMPORT_TEXT} /></details>
      </fieldset>
      <div className="story-paste-create"><p>สร้างเป็นเรื่องใหม่ พร้อมตัวละครและเนื้อหาที่ตรวจแล้ว</p><button className="reader-primary" onClick={create} disabled={creating || !draft.title.trim() || !draft.universe.trim() || draft.characters.some(c=>!c.name.trim()) || draft.parts.some(p=>!p.title.trim() || p.scenes.some(s=>!s.title.trim()))}>{creating ? <Loader2 size={17} className="animate-spin" />:<Check size={17} />} {creating ? "กำลังสร้างเรื่อง…":"สร้างเรื่องและตัวละคร"}</button></div>
    </>}
    {error && <p className="story-paste-error" role="alert">{error}</p>}
  </section>;
}
