"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, Square } from "lucide-react";
import type { DialogueBlock } from "@/lib/story/dialogueParser";
import { ReadAloudPlayback, type ReadingStatus } from "@/lib/audio/readAloud";

type Props={blocks:DialogueBlock[];activeIndex:number;onIndex:(index:number)=>void;onDucking:(active:boolean)=>void};
export function ReadAloudControls({blocks,activeIndex,onIndex,onDucking}:Props) {
  const [supported,setSupported]=useState<boolean|null>(null);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [voiceId,setVoiceId]=useState("");
  const [rate,setRate]=useState(1);
  const [status,setStatus]=useState<ReadingStatus>("idle");
  const [error,setError]=useState("");
  const player=useRef<ReadAloudPlayback|null>(null);
  const current=useRef({blocks,activeIndex,onIndex,onDucking});
  current.current={blocks,activeIndex,onIndex,onDucking};
  const spokenIndex=useRef(-1);
  const options=useRef({voices,voiceId,rate});options.current={voices,voiceId,rate};
  useEffect(()=>{
    const available="speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setSupported(available);
    if(!available) return;
    const synth=window.speechSynthesis;
    const loadVoices=()=>{
      const list=synth.getVoices().sort((a,b)=>Number(/^th/i.test(b.lang))-Number(/^th/i.test(a.lang)) || Number(b.localService)-Number(a.localService));
      setVoices(list);
      setVoiceId(previous=>list.some(v=>v.voiceURI===previous) ? previous:(list.find(v=>/^th/i.test(v.lang))?.voiceURI || list[0]?.voiceURI || ""));
    };
    player.current=new ReadAloudPlayback(synth,text=>new SpeechSynthesisUtterance(text),update=>{
      setStatus(update.status);current.current.onDucking(update.status==="playing");
      if(update.error) setError(update.error);
      if(update.status==="playing" && update.index>=0) {spokenIndex.current=update.index;current.current.onIndex(update.index);}
    });
    loadVoices();synth.addEventListener("voiceschanged",loadVoices);
    return ()=>{synth.removeEventListener("voiceschanged",loadVoices);player.current?.dispose();player.current=null;current.current.onDucking(false);};
  },[]);
  useEffect(()=>{player.current?.configure(voices.find(v=>v.voiceURI===voiceId) || null,rate);},[voices,voiceId,rate]);
  // Clicking a different paragraph or using the reader arrows seeks the narration too.
  useEffect(()=>{
    if(activeIndex!==spokenIndex.current && status!=="idle") {
      if(status==="paused") {player.current?.stop();return;}
      const config=options.current;
      player.current?.configure(config.voices.find(v=>v.voiceURI===config.voiceId) || null,config.rate);
      player.current?.play(current.current.blocks,activeIndex);
    }
  },[activeIndex,status]);
  const sourceText=blocks.map(block=>block.text).join("\n");
  useEffect(()=>{player.current?.stop();setError("");},[sourceText]);
  const readable=blocks.some(b=>b.type!=="sound" && b.text.trim());
  const start=()=>{setError("");player.current?.play(blocks,activeIndex);};
  return <section className="read-aloud-controls" aria-label="ฟังนิยาย">
    <div className="read-aloud-actions">
      <button type="button" className="reader-primary" disabled={!supported || !readable} onClick={()=>status==="playing" ? player.current?.pause():status==="paused" ? player.current?.resume():start()}>
        {status==="playing" ? <Pause size={16}/>:status==="paused" ? <Play size={16}/>:<Headphones size={16}/>}
        {status==="playing" ? "พักเสียงอ่าน":status==="paused" ? "ฟังต่อ":"ฟังนิยาย"}
      </button>
      <button type="button" className="workspace-secondary" disabled={status==="idle"} onClick={()=>player.current?.stop()} aria-label="หยุดอ่าน"><Square size={14}/></button>
      <label>ความเร็ว<select aria-label="ความเร็วเสียงอ่าน" value={rate} onChange={e=>setRate(Number(e.target.value))}>{[0.75,1,1.25,1.5].map(value=><option key={value} value={value}>{value}×</option>)}</select></label>
      <label className="read-aloud-voice">เสียงอ่าน<select aria-label="เลือกเสียงอ่าน" value={voiceId} onChange={e=>setVoiceId(e.target.value)} disabled={!supported || !voices.length}>
        {!voices.length && <option value="">เสียงเริ่มต้นของอุปกรณ์</option>}
        {voices.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
      </select></label>
    </div>
    <p className="read-aloud-status" role="status">{error || (supported===false ? "เบราว์เซอร์นี้ยังไม่รองรับเสียงอ่าน ลองเปิดด้วย Chrome, Edge หรือ Safari":status==="playing" ? `กำลังอ่านประโยค ${activeIndex+1} / ${blocks.length} · ลดเสียงเพลงให้อัตโนมัติ`:status==="paused" ? "พักอยู่ · ฟังต่อจะเริ่มจากช่วงข้อความที่พักไว้":"อ่านคำบรรยายและบทสนทนาทีละฉาก · ไม่ใช้ API Key")}</p>
    {supported && voices.length>0 && !voices.some(v=>/^th/i.test(v.lang)) && <p className="read-aloud-status">ยังไม่พบเสียงภาษาไทยในอุปกรณ์ สามารถเพิ่มเสียงไทยในการตั้งค่าเสียงของเครื่อง แล้วเปิดหน้านี้ใหม่</p>}
  </section>;
}
