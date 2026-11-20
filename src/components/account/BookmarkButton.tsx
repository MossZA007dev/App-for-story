'use client';
import {useEffect,useRef,useState} from 'react';
import {Bookmark,Loader2} from 'lucide-react';
import {toast} from 'sonner';
export function BookmarkButton({projectId,sceneId,index=0}:{projectId:string;sceneId?:string;index?:number}){
 const [saved,setSaved]=useState<string|null>(null),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);const pending=useRef(false);
 useEffect(()=>{const controller=new AbortController();setSaved(null);setReady(false);fetch('/api/account/bookmarks',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(items=>{setSaved(items.find((i:{projectId:string;sceneId:string|null;id:string})=>i.projectId===projectId&&(i.sceneId||'')===(sceneId||''))?.id||null);setReady(true);}).catch(()=>{});return()=>controller.abort();},[projectId,sceneId]);
 async function toggle(){if(pending.current)return;pending.current=true;setBusy(true);try{const response=await fetch('/api/account/bookmarks',{method:saved?'DELETE':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved?{id:saved}:{projectId,sceneId:sceneId||null,blockIndex:index})});const result=await response.json();if(!response.ok)throw new Error(result.error||'บันทึกบุ๊กมาร์กไม่สำเร็จ');setSaved(saved?null:result.id);toast.success(saved?'นำออกจากบุ๊กมาร์กแล้ว':'เก็บฉากและตำแหน่งนี้แล้ว');}catch(e){toast.error(e instanceof Error?e.message:'เชื่อมต่อไม่ได้');}finally{pending.current=false;setBusy(false);}}
 return <button type="button" className={`reader-bookmark ${saved?'is-saved':''}`} aria-label={saved?'นำออกจากบุ๊กมาร์ก':'บุ๊กมาร์กตำแหน่งนี้'} title={saved?'นำออกจากบุ๊กมาร์ก':'บุ๊กมาร์กตำแหน่งนี้'} aria-pressed={!!saved} disabled={busy||!ready} onClick={toggle}>{busy?<Loader2 size={18} className="animate-spin"/>:<Bookmark size={18} fill={saved?'currentColor':'none'}/>}<span>{saved?'เก็บแล้ว':'บุ๊กมาร์ก'}</span></button>;
}
