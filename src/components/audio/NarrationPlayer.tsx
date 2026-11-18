"use client";
import {useState} from "react";
import type {DialogueBlock} from "@/lib/story/dialogueParser";
import {ReadAloudControls} from "./ReadAloudControls";
import {ElevenLabsNarration} from "./ElevenLabsNarration";
type Props={projectId:string;sceneId:string;blocks:DialogueBlock[];activeIndex:number;onIndex:(index:number)=>void;onDucking:(value:boolean)=>void};
export function NarrationPlayer(props:Props) {
  const [provider,setProvider]=useState("elevenlabs");
  return <div className="read-aloud-controls"><div className="read-aloud-actions mb-2" role="group" aria-label="วิธีฟังนิยาย">
    <button type="button" className={provider==="elevenlabs" ? "reader-primary":"workspace-secondary"} aria-pressed={provider==="elevenlabs"} onClick={()=>setProvider("elevenlabs")}>เสียงพากย์ ElevenLabs</button>
    <button type="button" className={provider==="device" ? "reader-primary":"workspace-secondary"} aria-pressed={provider==="device"} onClick={()=>setProvider("device")}>เสียงจากอุปกรณ์</button>
  </div>{provider==="elevenlabs" ? <ElevenLabsNarration {...props}/>:<ReadAloudControls {...props}/>}</div>;
}
