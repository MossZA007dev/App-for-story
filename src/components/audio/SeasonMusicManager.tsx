'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Music,Layers,Disc3,X,Check,Upload,Link2,Library,Loader2,Headphones,ChevronRight} from 'lucide-react';
import {toast} from 'sonner';
import {extractYouTubeVideoId} from '@/lib/audio/audioHelpers';
import './season-music.css';
type Target={id:string;title:string;number:number;bgmUrl:string;bgmTitle:string;updatedAt:string;sceneOverrides:number;bgmMode?:'inherit'|'custom'|'silent'};
type MusicData={part:Target;episodes:Target[]};
type Track={id:string;name:string;audioUrl:string;category?:string};
type Props={isOpen:boolean;onClose:()=>void;projectId:string;partId:string;activeEpisodeId?:string;onChanged:()=>Promise<void>};
export function SeasonMusicManager({isOpen,onClose,projectId,partId,activeEpisodeId,onChanged}:Props){
 const dialog=useRef<HTMLDialogElement>(null),fileInput=useRef<HTMLInputElement>(null);
 const[data,setData]=useState<MusicData|null>(null),[tracks,setTracks]=useState<Track[]>([]),[scope,setScope]=useState('season'),[episodeId,setEpisodeId]=useState(''),[mode,setMode]=useState<'inherit'|'custom'|'silent'>('custom'),[source,setSource]=useState<'vault'|'url'|'file'>('vault'),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[file,setFile]=useState<File|null>(null),[clear,setClear]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(false);
 const endpoint=`/api/projects/${projectId}/parts/${partId}/music`;
 const target=scope==='season'?data?.part:data?.episodes.find(ep=>ep.id===episodeId);
 useEffect(()=>{
  if(!isOpen||!partId)return;
  const controller=new AbortController();setData(null);setScope('season');setError('');setPreview(false);
  dialog.current?.showModal();
  Promise.all([fetch(endpoint,{signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'โหลดเพลงไม่สำเร็จ');return body as MusicData;}),fetch(`/api/projects/${projectId}/sfx`,{signal:controller.signal}).then(r=>r.ok?r.json():{soundEffects:[]}).catch(()=>({soundEffects:[]}))]).then(([music,vault])=>{
   if(controller.signal.aborted)return;setData(music);setTracks(((vault as {soundEffects?:Track[]}).soundEffects||[]).filter((track:Track)=>track.category==='music'));setEpisodeId(music.episodes.some(ep=>ep.id===activeEpisodeId)?activeEpisodeId!:music.episodes[0]?.id||'');
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[isOpen,endpoint,projectId,partId]);
 useEffect(()=>{
  setMode(scope==='season'?(target?.bgmUrl?'custom':'inherit'):target?.bgmMode||'inherit');setUrl(target?.bgmUrl||'');setTitle(target?.bgmTitle||'');setFile(null);setClear(false);setPreview(false);setSource(target?.bgmUrl?'url':'vault');if(fileInput.current)fileInput.current.value='';
 },[target,scope]);
 useEffect(()=>{if(!isOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[isOpen]);
 const close=()=>{if(!busy)onClose();};
 const save=async()=>{
  if(!target||busy)return;if(mode==='custom'&&!url.trim()&&!file){setError('เลือกเพลงจากคลัง ใส่ลิงก์ หรืออัปโหลดไฟล์ก่อนครับ');return;}
  setBusy(true);setError('');setPreview(false);
  try{
   const settings={...(scope==='episode'?{episodeId:target.id}:{}),mode,url:mode==='custom'?url.trim():'',title:title.trim(),expectedUpdatedAt:target.updatedAt,clearSceneOverrides:clear};
   const body=file&&mode==='custom'?new FormData():JSON.stringify(settings);
   if(body instanceof FormData){body.set('settings',JSON.stringify({...settings,url:''}));body.set('file',file!);}
   const response=await fetch(endpoint,{method:'POST',...(body instanceof FormData?{}:{headers:{'Content-Type':'application/json'}}),body});
   const result=await response.json();
   if(!response.ok){if(response.status===409){const latest=await fetch(endpoint).then(r=>r.ok?r.json():null);if(latest)setData(latest);}throw new Error(result.error||'บันทึกเพลงไม่สำเร็จ');}
   setData(result);setFile(null);setClear(false);await onChanged();toast.success(scope==='season'?'บันทึกเพลงหลักของ SS แล้ว ทุก EP ที่ใช้เพลงหลักจะอัปเดตตาม':'บันทึกเพลงของ EP แล้ว');
  }catch(e){setError(e instanceof Error?e.message:'บันทึกเพลงไม่สำเร็จ');}finally{setBusy(false);}
 };
 if(!isOpen)return null;
 const yt=extractYouTubeVideoId(url);
 return createPortal(<dialog ref={dialog} className="sm-overlay" aria-labelledby="season-music-heading" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>
  <div className="sm-dialog">
   <header className="sm-header"><span className="sm-symbol"><Headphones size={24}/></span><div><span className="sm-eyebrow">STORY SOUNDTRACK</span><h2 id="season-music-heading">เพลงประกอบ SS และ EP</h2><p>{data?`ภาค ${data.part.number} · ${data.part.title}`:'กำลังโหลดเพลงของภาคนี้'}</p></div><button type="button" aria-label="ปิดการตั้งค่าเพลง" disabled={busy} onClick={close}><X size={20}/></button></header>
   <div className="sm-content">
    {error&&<p className="sm-error" role="alert">{error}</p>}
    {!data?<div className="sm-loading"><Loader2 size={19}/>{error?'ปิดแล้วเปิดใหม่เพื่อลองอีกครั้ง':'กำลังโหลดเพลง…'}</div>:<>
     <div className="sm-season-summary"><Layers size={21}/><div><small>เพลงหลักของ SS</small><strong>{data.part.bgmTitle|| (data.part.bgmUrl?'เพลงหลักประจำ SS':'ยังไม่ได้เลือกเพลงหลัก')}</strong><p>ตั้งครั้งเดียว ทุก EP ใช้ตามได้ทันที รวมถึง EP ที่สร้างใหม่</p></div><span>{data.episodes.length} EP</span></div>
     <div className="sm-tabs" role="group" aria-label="ระดับการตั้งค่าเพลง"><button disabled={busy} aria-pressed={scope==='season'} onClick={()=>setScope('season')}><Layers size={16}/>เพลงทั้ง SS</button><button disabled={busy||!data.episodes.length} aria-pressed={scope==='episode'} onClick={()=>setScope('episode')}><Disc3 size={16}/>ปรับเฉพาะ EP</button></div>
     {scope==='episode'&&<label className="sm-field">เลือก EP<select disabled={busy} value={episodeId} onChange={e=>setEpisodeId(e.target.value)}>{data.episodes.map(ep=><option key={ep.id} value={ep.id}>EP {ep.number} · {ep.title}</option>)}</select></label>}
     <fieldset className="sm-form" disabled={busy}>
      <div className="sm-modes">{(scope==='season'?[['custom','เลือกเพลงหลัก'],['inherit','ไม่มีเพลงหลัก']]:[['inherit','ใช้เพลงของ SS'],['custom','เลือกเพลงเฉพาะ EP'],['silent','ปิดเพลง EP นี้']]).map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>{setMode(value as typeof mode);setPreview(false);}}>{mode===value&&<Check size={14}/>}<span>{label}</span></button>)}</div>
      {mode==='custom'?<>
       <div className="sm-source-tabs" role="group" aria-label="แหล่งที่มาของเพลง">{([['vault','คลังเพลง',Library],['url','ใส่ลิงก์',Link2],['file','อัปโหลด',Upload]] as const).map(([value,label,Icon])=><button type="button" key={value} aria-pressed={source===value} onClick={()=>{setSource(value);setFile(null);setPreview(false);}}><Icon size={15}/>{label}</button>)}</div>
       {source==='vault'?<label className="sm-field">เลือกจากคลังเสียง<select value={tracks.some(t=>t.audioUrl===url)?url:''} onChange={e=>{const track=tracks.find(t=>t.audioUrl===e.target.value);setUrl(track?.audioUrl||'');setTitle(track?.name||'');setFile(null);setPreview(false);}}><option value="">{tracks.length?'เลือกเพลง…':'ยังไม่มีเพลงในคลัง — ใส่ลิงก์หรืออัปโหลดได้'}</option>{tracks.map(track=><option key={track.id} value={track.audioUrl}>{track.name}</option>)}</select></label>:source==='url'?<label className="sm-field">ลิงก์เพลง<input type="url" placeholder="YouTube หรือ URL ไฟล์เสียง" value={url} onChange={e=>{setUrl(e.target.value);setFile(null);setPreview(false);}}/></label>:<label className="sm-file"><Upload size={24}/><strong>{file?.name||'เลือกไฟล์เพลงจากเครื่อง'}</strong><span>MP3, WAV, M4A, OGG, WebM · ไม่เกิน 4 MB</span><input ref={fileInput} type="file" accept=".mp3,.wav,.m4a,.ogg,.webm" onChange={e=>{const chosen=e.target.files?.[0]||null;if(chosen&&chosen.size>4*1024*1024){setError('ไฟล์เพลงต้องมีขนาดไม่เกิน 4 MB');e.target.value='';return;}setFile(chosen);setUrl('');setPreview(false);setError('');}}/></label>}
       <label className="sm-field">ชื่อเพลง<input value={title} maxLength={200} placeholder={scope==='season'?'เช่น ธีมหลัก · ปีที่ 3':'เช่น EP 7 · จุดเปลี่ยน'} onChange={e=>setTitle(e.target.value)}/></label>
       {url&&!file&&<button className="sm-preview-button" type="button" onClick={()=>setPreview(!preview)}><Headphones size={15}/>{preview?'ปิดตัวอย่าง':'ฟังตัวอย่างเพลง'}</button>}
       {preview&&url&&(yt?<iframe className="sm-youtube" title="ตัวอย่างเพลง" src={`https://www.youtube-nocookie.com/embed/${yt}`} allow="encrypted-media"/>:<audio key={url} controls src={url} preload="none" className="sm-audio"/>)}
      </>:<div className="sm-inherit-note"><Music size={18}/><p>{scope==='season'?'EP ที่ใช้เพลงตาม SS จะไม่มีเพลงพื้นหลัง ส่วน EP ที่เลือกเพลงเองยังใช้เพลงเดิม':mode==='silent'?'EP นี้จะไม่เล่นเพลงหลักของ SS คุณยังปรับกลับมาใช้เพลงหลักได้ทุกเมื่อ':`EP นี้จะใช้ ${data.part.bgmTitle||'เพลงหลักของ SS'} และเปลี่ยนตามเมื่อแก้เพลงหลัก`}</p></div>}
      {!!target?.sceneOverrides&&<label className="sm-clear"><input type="checkbox" checked={clear} onChange={e=>setClear(e.target.checked)}/><span>ใช้การตั้งค่านี้แทนเพลงเฉพาะฉากเดิม {target.sceneOverrides} ฉาก<small>ล้างเฉพาะการเลือกเพลงประจำฉากใน{scope==='season'?' SS นี้':' EP นี้'} ไฟล์เพลงยังอยู่ในคลัง</small></span></label>}
     </fieldset>
     <p className="sm-priority">ลำดับเพลงที่ใช้: เพลงเฉพาะฉาก → เพลงของ EP → เพลงหลักของ SS</p>
     <section className="sm-episode-list"><h3>ภาพรวมเพลงแต่ละ EP</h3>{data.episodes.length?data.episodes.map(ep=><button key={ep.id} type="button" disabled={busy} aria-current={scope==='episode'&&episodeId===ep.id?'true':undefined} onClick={()=>{setScope('episode');setEpisodeId(ep.id);}}><span className="sm-ep-number">{ep.number}</span><span><strong>{ep.title}</strong><small>{ep.bgmMode==='custom'?ep.bgmTitle||'เพลงเฉพาะ EP':ep.bgmMode==='silent'?'ปิดเพลงพื้นหลัง':data.part.bgmTitle||'ยังไม่มีเพลงหลัก'}{ep.sceneOverrides?` · ${ep.sceneOverrides} ฉากเลือกเพลงเอง`:''}</small></span><em>{ep.bgmMode==='custom'?'เพลงเฉพาะ EP':ep.bgmMode==='silent'?'ปิดเพลง':'ตาม SS'}</em><ChevronRight size={15}/></button>):<p>สร้าง EP ใหม่ แล้ว EP จะใช้เพลงหลักของ SS โดยอัตโนมัติ</p>}</section>
    </>}
   </div>
   <footer className="sm-footer"><span>บันทึกไว้ส่วนกลาง ใช้ได้ทั้งห้องเขียนและหน้าอ่าน</span><button className="sm-save" type="button" disabled={busy||!target} onClick={save}>{busy?<Loader2 size={16}/>:<Check size={16}/>}{busy?'กำลังบันทึก…':'บันทึกเพลง'}</button></footer>
  </div>
 </dialog>,document.body);
}
