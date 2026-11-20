'use client';
import {useEffect,useRef,useState} from 'react';
/** Only account-scoped server progress is restored; no shared-browser manuscript history. */
export function useReadingProgress(projectId:string,sceneId:string|undefined,index:number,total:number,onIndex:(index:number)=>void){
 const [loadedScene,setLoadedScene]=useState('');
 const hydrated=useRef(''),callback=useRef(onIndex);callback.current=onIndex;
 useEffect(()=>{
  hydrated.current='';setLoadedScene('');if(!sceneId||!total)return;const controller=new AbortController();
  const query=new URLSearchParams(window.location.search),explicit=Number(query.get('block'));
  if(query.get('sceneId')===sceneId&&query.has('block')&&Number.isInteger(explicit)&&explicit>=0){callback.current(Math.min(total-1,explicit));hydrated.current=sceneId;setLoadedScene(sceneId);return;}
  fetch(`/api/projects/${projectId}/reading-progress`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(saved=>{
   if(controller.signal.aborted)return;
   callback.current(saved?.sceneId===sceneId?Math.min(total-1,Math.max(0,saved.blockIndex)):0);hydrated.current=sceneId;setLoadedScene(sceneId);
  }).catch(()=>{});
  return()=>controller.abort();
 },[projectId,sceneId,total]);
 useEffect(()=>{
  if(!sceneId||!total)return;
  const save=()=>{if(hydrated.current!==sceneId)return;void fetch(`/api/projects/${projectId}/reading-progress`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({sceneId,blockIndex:index}),keepalive:true}).catch(()=>{});};
  const timer=setTimeout(save,800);const onHide=()=>{if(document.visibilityState==='hidden')save();};document.addEventListener('visibilitychange',onHide);
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',onHide);};
 },[projectId,sceneId,index,total,loadedScene]);
}
