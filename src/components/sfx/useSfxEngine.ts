'use client';
import {useEffect,useRef,useState} from 'react';
import {SfxCueEngine} from '@/lib/audio/sfxCueEngine';
import {builtinSfxUrl} from '@/lib/audio/sfxBuiltins';
import type {SfxCue,SfxTrack} from '@/lib/audio/sfxCues';
export function useSfxEngine(active=true){const engine=useRef<SfxCueEngine|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!active)return;const urls=new Map<string,string>();engine.current=new SfxCueEngine(source=>{let url=source;if(source.startsWith('builtin:')){url=urls.get(source)||builtinSfxUrl(source.slice(8));urls.set(source,url);}return new Audio(url);},setError);return()=>{engine.current?.reset();engine.current=null;urls.forEach(url=>URL.revokeObjectURL(url));};},[active]);
 return {engine,error,clearError:()=>setError(''),preview:(cue:SfxCue,tracks:SfxTrack[])=>{setError('');engine.current?.preview(cue,tracks);},stop:()=>engine.current?.stop()};
}
