'use client';
import {useEffect,useRef,useState} from 'react';
import {ReaderAtmosphereEngine} from '@/lib/audio/readerAtmosphereEngine';
import {inferAtmosphere,type AtmosphereKind} from '@/lib/story/readerAtmosphere';
export function useReaderAtmosphere(location:string,title:string,ducking:boolean){
 const [choice,setChoice]=useState<AtmosphereKind|'auto'>('auto'),[volume,setVolume]=useState(35),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const engine=useRef<ReaderAtmosphereEngine|null>(null),alive=useRef(true),inFlight=useRef(false),ready=useRef(false),latest=useRef({volume,ducking});latest.current={volume,ducking};
 const kind=choice==='auto'?inferAtmosphere(location,title):choice;
 useEffect(()=>{alive.current=true;try{const s=JSON.parse(localStorage.getItem('saga-reader-atmosphere')||'{}');if(['auto','none','rain','wind','fire','train'].includes(s.choice))setChoice(s.choice);if(Number.isFinite(s.volume))setVolume(Math.max(0,Math.min(100,s.volume)));}catch{}ready.current=true;return()=>{alive.current=false;engine.current?.dispose();engine.current=null;};},[]);
 useEffect(()=>{if(ready.current)try{localStorage.setItem('saga-reader-atmosphere',JSON.stringify({choice,volume}));}catch{}},[choice,volume]);
 useEffect(()=>{if(!enabled)return;engine.current?.setKind(kind);},[kind,enabled]);
 useEffect(()=>{engine.current?.setLevel(enabled&&!document.hidden?volume/100*.16*(ducking?.2:1):0);},[volume,ducking,enabled]);
 useEffect(()=>{const changed=()=>{const e=engine.current;if(!e)return;if(document.hidden)e.pause().catch(()=>{});else if(enabled)e.resume().catch(()=>{});e.setLevel(enabled&&!document.hidden?latest.current.volume/100*.16*(latest.current.ducking?.2:1):0);};document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed);},[enabled]);
 const toggle=async()=>{if(inFlight.current)return;if(enabled){engine.current?.setLevel(0);engine.current?.setKind('none');setEnabled(false);return;}inFlight.current=true;setBusy(true);setError('');try{if(!engine.current)engine.current=new ReaderAtmosphereEngine();await engine.current.resume();if(alive.current){engine.current.setKind(kind);setEnabled(true);}}catch{engine.current?.dispose();engine.current=null;if(alive.current)setError('เปิดเสียงบรรยากาศไม่ได้ ลองเปิดใหม่ในเบราว์เซอร์ที่รองรับเสียง');}finally{inFlight.current=false;if(alive.current)setBusy(false);}};
 return {choice,setChoice,kind,volume,setVolume,enabled,busy,error,toggle};
}
