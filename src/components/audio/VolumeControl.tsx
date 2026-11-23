'use client';
import {useId} from 'react';
import {Minus,Plus} from 'lucide-react';
import './volume-control.css';
export function VolumeControl({label,value,onChange,disabled=false,status}:{label:string;value:number;onChange:(value:number)=>void;disabled?:boolean;status?:string}){
 const id=useId(),level=Math.max(0,Math.min(100,Math.round(value)));
 const change=(next:number)=>onChange(Math.max(0,Math.min(100,next)));
 return <div className="sound-volume"><div className="sound-volume-heading"><label htmlFor={id}>{label}</label><output htmlFor={id}>{level}%{status&&<small> · {status}</small>}</output></div><div className="sound-volume-row">
  <button type="button" aria-label={`ลด${label}`} title="ลด 5%" disabled={disabled||level===0} onClick={()=>change(level-5)}><Minus size={16}/></button>
  <input id={id} aria-label={label} type="range" min="0" max="100" step="1" value={level} disabled={disabled} onChange={event=>change(Number(event.target.value))}/>
  <button type="button" aria-label={`เพิ่ม${label}`} title="เพิ่ม 5%" disabled={disabled||level===100} onClick={()=>change(level+5)}><Plus size={16}/></button>
 </div></div>;
}
