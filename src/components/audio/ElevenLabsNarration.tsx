"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Check,Headphones,Loader2,Mic,SkipBack,SkipForward,Users} from "lucide-react";
import type {DialogueBlock} from "@/lib/story/dialogueParser";
import {castVoice,speakerOf,type VoiceCasting,type NarrationSpeaker} from "@/lib/audio/narrationCasting";
type Segment={id:string;url:string;cached:boolean;text:string;blockIndex:number;voiceId?:string;speakerName?:string};
type Plan={segments:Segment[];credits:number;remaining:number|null;sourceVersion:string;sourceHash:string};
type Voice={id:string;name:string;gender:string};
type Attached={kind:"scene"|"preview";casting:VoiceCasting;segments:Segment[];ready:boolean;stale:boolean;attachedAt:string;sample?:string;previewSpeaker?:string};
type Props={projectId:string;sceneId:string;blocks:DialogueBlock[];activeIndex:number;onIndex:(index:number)=>void;onDucking:(value:boolean)=>void};
export function ElevenLabsNarration({projectId,sceneId,blocks,activeIndex,onIndex,onDucking}:Props) {
  const [voices,setVoices]=useState<Voice[]>([]),[casting,setCasting]=useState<VoiceCasting|null>(null),[speakers,setSpeakers]=useState<NarrationSpeaker[]>([]);
  const [configured,setConfigured]=useState<boolean|null>(null),[remaining,setRemaining]=useState<number|null>(null),[rate,setRate]=useState(1);
  const [mode,setMode]=useState<"preview"|"scene">("scene"),[previewSpeaker,setPreviewSpeaker]=useState("narrator");
  const [sample,setSample]=useState(()=>blocks.slice(activeIndex).find(b=>b.type!=="sound")?.text.slice(0,250) || "");
  const [plan,setPlan]=useState<Plan|null>(null),[attached,setAttached]=useState<Attached|null>(null),[clips,setClips]=useState<Segment[]>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [clipIndex,setClipIndex]=useState(0),[speed,setSpeed]=useState(1),[progress,setProgress]=useState(0);
  const audio=useRef<HTMLAudioElement|null>(null),cancelled=useRef(false),mounted=useRef(true),inFlight=useRef(false),advance=useRef(false),epoch=useRef(0);
  const latest=useRef({onDucking,onIndex});latest.current={onDucking,onIndex};
  const bindAudio=useCallback((node:HTMLAudioElement|null)=>{if(!node){audio.current?.pause();latest.current.onDucking(false);}audio.current=node;},[]);
  const endpoint=`/api/projects/${projectId}/scenes/${sceneId}/narration`;
  const source=JSON.stringify(blocks.map(b=>({text:b.text,speaker:speakerOf(b)})));
  const invalidate=()=>{audio.current?.pause();setPlan(null);setError("");setMessage("");};
  const refreshCredits=async()=>{
    const response=await fetch("/api/narration/voices",{cache:"no-store"});const data=await response.json();
    if(!response.ok)throw new Error(data.error || "โหลดเสียงไม่สำเร็จ");
    if(mounted.current){setConfigured(data.configured);setVoices(data.voices || []);setRemaining(data.quota?.remaining ?? null);setRate(data.rate || 1);}
    return data;
  };
  useEffect(()=>{
    mounted.current=true;cancelled.current=true;const token=++epoch.current;setLoading(true);setPlan(null);setClips([]);setAttached(null);setMessage("");setError("");audio.current?.pause();
    (async()=>{
      try {
        const [savedResult,voiceResult]=await Promise.allSettled([fetch(endpoint,{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);return data;}),refreshCredits()]);
        if(!mounted.current || epoch.current!==token)return;
        if(savedResult.status==="rejected")throw savedResult.reason;
        const saved=savedResult.value;setSpeakers(saved.speakers);
        const list:Voice[]=voiceResult.status==="fulfilled" ? voiceResult.value.voices || []:[];
        if(voiceResult.status==="rejected")setError(voiceResult.reason instanceof Error ? voiceResult.reason.message:"โหลดเสียงไม่สำเร็จ");
        const fallback=list[0]?.id || "";
        const male=list.find(v=>v.gender==="male" && /george/i.test(v.name))?.id || list.find(v=>v.gender==="male")?.id || fallback;
        const female=list.find(v=>v.gender==="female" && /sarah/i.test(v.name))?.id || list.find(v=>v.gender==="female")?.id || fallback;
        setCasting(saved.attached?.casting || {narrator:list.find(v=>/brian/i.test(v.name))?.id || male,male,female,overrides:{}});
        if(saved.attached) {setAttached(saved.attached);if(saved.attached.ready){setClips(saved.attached.segments);setClipIndex(0);}}
      }catch(error){if(mounted.current && epoch.current===token)setError(error instanceof Error ? error.message:"โหลดเสียงประจำฉากไม่สำเร็จ");}
      finally{if(mounted.current && epoch.current===token)setLoading(false);}
    })();
    return()=>{mounted.current=false;cancelled.current=true;audio.current?.pause();latest.current.onDucking(false);};
  },[endpoint,source]);
  useEffect(()=>{if(audio.current)audio.current.playbackRate=speed;},[speed,clipIndex,clips]);
  useEffect(()=>{if(advance.current && audio.current){advance.current=false;audio.current.play().catch(()=>setMessage("กดเล่นเพื่อฟังเสียงถัดไป"));}},[clipIndex]);
  const request=async(body:Record<string,unknown>)=>{
    const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({casting,mode,previewSpeaker,...(mode==="preview" ? {text:sample}:{}),...body})});
    const data=await response.json();if(!response.ok)throw new Error(data.error || "สร้างเสียงไม่สำเร็จ");return data;
  };
  const prepare=async()=>{
    if(inFlight.current)return;const token=epoch.current;inFlight.current=true;setBusy(true);setError("");setMessage("");audio.current?.pause();
    try {const data:Plan=await request({action:"plan"});if(!mounted.current || epoch.current!==token)return;setPlan(data);if(data.remaining!==null)setRemaining(data.remaining);if(data.credits===0){setClips(data.segments);setClipIndex(0);setMessage("เสียงครบแล้ว ใช้ไฟล์เดิมได้ทันทีโดยไม่เสียเครดิตเพิ่ม");}}
    catch(error){if(mounted.current && epoch.current===token)setError(error instanceof Error ? error.message:"เตรียมเสียงไม่สำเร็จ");}
    finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  };
  const saveToScene=async(snapshot:Plan)=>{
    const data=await request({action:"attach",sourceVersion:snapshot.sourceVersion,sourceHash:snapshot.sourceHash});
    if(mounted.current){setAttached(data.attached);setMessage(mode==="scene" ? "บันทึกเสียงทั้งฉากแล้ว เปิดฉากนี้ครั้งหน้ากดฟังได้เลย":"ใส่เสียงทดลองในฉากแล้ว");}
  };
  const generate=async()=>{
    if(!plan || inFlight.current)return;const token=epoch.current;inFlight.current=true;setBusy(true);setError("");cancelled.current=false;setProgress(0);audio.current?.pause();const completed:Segment[]=[];
    try {
      for(let i=0;i<plan.segments.length;i++) {
        if(cancelled.current || !mounted.current || epoch.current!==token)break;
        setMessage(`กำลังสร้างเสียง ${i+1} จาก ${plan.segments.length}`);
        const segment=plan.segments[i];
        completed.push(segment.cached ? segment:(await request({action:"generate",segmentIndex:i,sourceVersion:plan.sourceVersion,sourceHash:plan.sourceHash})).segment);
        if(mounted.current && epoch.current===token)setProgress(i+1);
      }
      if(mounted.current && epoch.current===token){
        setClips(completed);setClipIndex(0);
        if(!cancelled.current && completed.length===plan.segments.length){if(mode==="scene")await saveToScene(plan);else setMessage("เสียงทดลองพร้อมแล้ว ฟังตัวอย่างก่อนสร้างทั้งฉากได้เลย");setPlan({...plan,segments:completed,credits:0});}
        else {setPlan(null);setMessage("หยุดแล้ว ไฟล์ที่สำเร็จยังอยู่ กดตรวจเครดิตเพื่อสร้างต่อได้");}
        void refreshCredits().catch(()=>{});
      }
    }catch(error){if(mounted.current && epoch.current===token){setClips(completed);setClipIndex(0);setPlan(null);setError(error instanceof Error ? error.message:"สร้างเสียงไม่สำเร็จ");}}
    finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  };
  const changeCasting=(key:"narrator"|"male"|"female",value:string)=>{invalidate();setCasting(prev=>prev ? {...prev,[key]:value}:prev);};
  const voiceOptions=(selected?:string)=><>{selected && !voices.some(v=>v.id===selected) && <option value={selected}>เสียงที่บันทึกไว้</option>}<option value="">เลือกเสียง</option>{voices.map(voice=><option key={voice.id} value={voice.id}>{voice.name}</option>)}</>;
  const estimated=Math.ceil((mode==="preview" ? sample.length:blocks.filter(b=>b.type!=="sound").reduce((n,b)=>n+b.text.length,0))*rate);
  const changePreviewSpeaker=(key:string)=>{invalidate();setPreviewSpeaker(key);setSample(blocks.find(b=>b.type!=="sound" && speakerOf(b).key===key)?.text.slice(0,250) || sample);};
  const clip=clips[clipIndex];
  return <section className="scene-voice-panel" aria-label="พากย์ด้วย ElevenLabs">
    <header className="scene-voice-heading"><div><h3><Headphones size={17}/>เสียงพากย์ประจำฉาก</h3><p>{attached?.ready ? attached.stale ? "บทหรือข้อมูลตัวละครเปลี่ยนแล้ว · เสียงที่บันทึกเป็นเวอร์ชันก่อน":attached.kind==="scene" ? "มีเสียงทั้งฉากแล้ว · เปิดฟังได้ทันที":"มีเสียงทดลองบันทึกไว้ในฉาก":"สร้างเสียงครั้งเดียว แล้วเปิดฟังพร้อมฉากได้ทุกครั้ง"}</p></div><span className="scene-voice-quota">{remaining!==null ? `${remaining.toLocaleString()} เครดิต`:"ElevenLabs"}</span></header>
    {loading && <p role="status" className="read-aloud-status">กำลังโหลดเสียงของฉาก…</p>}
    {configured===false && <p className="read-aloud-status"><Link href="/settings" className="text-amber-300 underline">ตั้งค่า ElevenLabs API Key</Link> เพื่อสร้างเสียงใหม่ เสียงที่บันทึกแล้วยังฟังได้</p>}
    {clip && <div className="scene-voice-player"><div className="scene-voice-now"><strong>{clip.speakerName || "เสียงพากย์"}</strong><span>{clipIndex+1} / {clips.length} ช่วง</span></div>
      <audio ref={bindAudio} controls preload="metadata" src={clip.url} onPlay={()=>{latest.current.onDucking(true);if(clip.blockIndex>=0 && !attached?.stale)latest.current.onIndex(clip.blockIndex);}} onPause={()=>latest.current.onDucking(false)} onError={()=>{latest.current.onDucking(false);setError("เปิดไฟล์เสียงไม่สำเร็จ กรุณาตรวจเครดิตและเตรียมเสียงใหม่");}} onEnded={()=>{latest.current.onDucking(false);if(clipIndex+1<clips.length){advance.current=true;setClipIndex(clipIndex+1);}}}/>
      <div className="scene-voice-transport"><button type="button" disabled={clipIndex===0} onClick={()=>{audio.current?.pause();advance.current=false;setClipIndex(i=>i-1);}} aria-label="เสียงพากย์ก่อนหน้า"><SkipBack size={15}/></button><button type="button" disabled={clipIndex+1===clips.length} onClick={()=>{audio.current?.pause();advance.current=false;setClipIndex(i=>i+1);}} aria-label="เสียงพากย์ถัดไป"><SkipForward size={15}/></button><label>ความเร็ว<select aria-label="ความเร็วเสียงพากย์" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[0.75,1,1.25,1.5].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><span>ฟังไฟล์เดิม · ไม่ใช้เครดิต</span></div>
    </div>}
    <fieldset disabled={busy || loading} className="scene-voice-form">
      <div className="scene-voice-modes" role="group" aria-label="ขอบเขตการพากย์"><button type="button" aria-pressed={mode==="scene"} onClick={()=>{invalidate();setMode("scene");}}>พากย์ทั้งฉาก</button><button type="button" aria-pressed={mode==="preview"} onClick={()=>{invalidate();setMode("preview");}}>ทดลองเสียงสั้น ๆ</button></div>
      <details className="scene-casting"><summary><Users size={16}/>เลือกเสียงผู้บรรยายและตัวละคร <span>{speakers.filter(s=>s.key!=="narrator").length} คน</span></summary>
        <div className="scene-default-voices">{([['narrator','ผู้บรรยาย'],['male','เสียงผู้ชาย'],['female','เสียงผู้หญิง']] as const).map(([key,label])=><label key={key}>{label}<select aria-label={label} value={casting?.[key] || ""} onChange={e=>changeCasting(key,e.target.value)}>{voiceOptions(casting?.[key])}</select></label>)}</div>
        <p className="read-aloud-status">เลือกเสียงตามเพศที่ระบุในข้อมูลตัวละคร ถ้าไม่ระบุจะใช้เสียงผู้บรรยาย ปรับเสียงรายคนได้ด้านล่าง</p>
        {speakers.filter(s=>s.key!=="narrator").map(speaker=><div className="scene-cast-row" key={speaker.key}><div><strong>{speaker.name}</strong><span>{speaker.gender==="male" ? "ชาย":speaker.gender==="female" ? "หญิง":"ยังไม่ระบุเพศ"} · {speaker.lines} บทพูด</span></div><label><span className="sr-only">เสียงของ {speaker.name}</span><select aria-label={`เสียงของ ${speaker.name}`} value={casting?.overrides[speaker.key] || ""} onChange={e=>{invalidate();setCasting(prev=>{if(!prev)return prev;const overrides={...prev.overrides};if(e.target.value)overrides[speaker.key]=e.target.value;else delete overrides[speaker.key];return {...prev,overrides};});}}><option value="">อัตโนมัติ — {speaker.gender==="male" ? "เสียงผู้ชาย":speaker.gender==="female" ? "เสียงผู้หญิง":"ผู้บรรยาย"}</option><option value="@male">ใช้เสียงผู้ชาย</option><option value="@female">ใช้เสียงผู้หญิง</option><option value="@narrator">ใช้เสียงผู้บรรยาย</option>{voices.map(voice=><option key={voice.id} value={voice.id}>{voice.name}</option>)}</select></label></div>)}
      </details>
      {mode==="preview" && <div className="scene-preview"><label>ทดลองเสียงของ<select aria-label="ผู้พูดที่ทดลองพากย์" value={previewSpeaker} onChange={e=>changePreviewSpeaker(e.target.value)}>{speakers.map(s=><option key={s.key} value={s.key}>{s.name}</option>)}</select></label><label>ข้อความทดลอง <span>{sample.length}/300</span><textarea aria-label="ข้อความทดลองพากย์" rows={3} maxLength={300} value={sample} onChange={e=>{invalidate();setSample(e.target.value);}}/></label></div>}
    </fieldset>
    <div className="scene-voice-footer"><p>{mode==="scene" ? "สร้างครบแล้วใส่เสียงในฉากให้อัตโนมัติ":"ทดลองด้วยเสียงที่เลือกก่อนสร้างทั้งฉาก"}<span>ประมาณ {estimated.toLocaleString()} เครดิต ก่อนหักไฟล์ที่มีแล้ว</span></p><button type="button" className="reader-primary" disabled={busy || loading || !casting?.narrator || !casting.male || !casting.female || !sceneId || (mode==="preview" && !sample.trim())} onClick={prepare}>{busy ? <Loader2 size={16} className="animate-spin"/>:<Mic size={16}/>}ตรวจเครดิตก่อนสร้าง</button></div>
    {plan && <div className="scene-voice-plan"><p><strong>{plan.credits.toLocaleString()} เครดิต</strong> · {plan.segments.filter(s=>!s.cached).length} ช่วงสร้างใหม่ · {plan.segments.filter(s=>s.cached).length} ช่วงใช้ไฟล์เดิม</p>
      {plan.credits>0 ? <button type="button" className="reader-primary" disabled={busy} onClick={generate}>{mode==="scene" ? "ยืนยันพากย์ทั้งฉากและใส่เสียง":"ยืนยันสร้างเสียงทดลอง"}</button>:<button type="button" className="reader-primary" disabled={busy} onClick={async()=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);try{await saveToScene(plan);}catch(error){setError(error instanceof Error ? error.message:"บันทึกเสียงไม่สำเร็จ");}finally{inFlight.current=false;if(mounted.current)setBusy(false);}}}><Check size={16}/>{mode==="scene" ? "ใช้เสียงชุดนี้กับฉาก":"ใส่เสียงทดลองนี้ในฉาก"}</button>}
      <p className="read-aloud-status">เมื่อยืนยัน ข้อความและเสียงที่เลือกจะส่งไป ElevenLabs เพื่อพากย์ เฉพาะช่วงที่ยังไม่มีไฟล์</p>
    </div>}
    {busy && plan && <div className="scene-voice-progress"><progress aria-label="ความคืบหน้าการพากย์" max={plan.segments.length} value={progress}/><button type="button" onClick={()=>{cancelled.current=true;setMessage("จะหยุดหลังคำขอปัจจุบันเสร็จ ไฟล์ที่สำเร็จจะยังอยู่");}}>หยุดหลังช่วงนี้</button></div>}
    {message && <p role="status" className="scene-voice-message">{message}</p>}{error && <p role="alert" className="scene-voice-error">{error}</p>}
  </section>;
}
