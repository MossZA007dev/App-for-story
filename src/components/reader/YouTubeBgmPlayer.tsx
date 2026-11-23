'use client';
import {useEffect,useRef} from 'react';
import {Minimize2} from 'lucide-react';
type Player={setVolume:(v:number)=>void;unMute:()=>void;playVideo:()=>void;pauseVideo:()=>void;destroy:()=>void};
type YTApi={Player:new(element:HTMLElement,options:Record<string,unknown>)=>Player};
let loading:Promise<YTApi>|null=null;
function loadApi(){const win=window as typeof window&{YT?:YTApi;onYouTubeIframeAPIReady?:()=>void};if(win.YT?.Player)return Promise.resolve(win.YT);if(loading)return loading;
 loading=new Promise<YTApi>((resolve,reject)=>{const previous=win.onYouTubeIframeAPIReady;const timeout=setTimeout(()=>{loading=null;reject(new Error('โหลดเครื่องเล่น YouTube ไม่สำเร็จ'));},15000);win.onYouTubeIframeAPIReady=()=>{previous?.();clearTimeout(timeout);if(win.YT?.Player)resolve(win.YT);else{loading=null;reject(new Error('เครื่องเล่น YouTube ยังไม่พร้อม'));}};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{clearTimeout(timeout);loading=null;script.remove();reject(new Error('เชื่อมต่อ YouTube ไม่สำเร็จ'));};document.head.appendChild(script);});return loading;
}
export function YouTubeBgmPlayer({videoId,level,enabled,expanded,onError,onHide}:{videoId:string;level:number;enabled:boolean;expanded:boolean;onError:(message:string)=>void;onHide:()=>void}){
 const host=useRef<HTMLDivElement>(null),player=useRef<Player|null>(null),ready=useRef(false),latest=useRef({level,enabled,onError});latest.current={level,enabled,onError};
 const started=useRef(false);if(enabled)started.current=true;
 const shouldLoad=started.current;
 useEffect(()=>{if(!shouldLoad)return;let alive=true;ready.current=false;const container=host.current;if(!container)return;
 loadApi().then(api=>{if(!alive)return;const node=document.createElement('div');container.replaceChildren(node);player.current=new api.Player(node,{width:'100%',height:'100%',videoId,playerVars:{playsinline:1,controls:1,loop:1,playlist:videoId,origin:window.location.origin},events:{onReady:()=>{if(!alive)return;ready.current=true;const p=player.current;if(!p)return;p.setVolume(Math.round(latest.current.level*100));p.unMute();if(latest.current.enabled)p.playVideo();else p.pauseVideo();},onError:()=>{if(alive)latest.current.onError('YouTube ไม่อนุญาตให้เล่นคลิปนี้ หรือคลิปเปิดไม่ได้ ลองเพลงอื่นหรือใช้ไฟล์เสียง');},onAutoplayBlocked:()=>{if(alive&&latest.current.enabled)latest.current.onError('YouTube รอให้กดเล่น กดแสดงเครื่องเล่น YouTube ในแผงเสียง แล้วกด Play');}}});}).catch(()=>{if(alive)latest.current.onError('โหลดเครื่องเล่น YouTube ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วรีเฟรช');});
 return()=>{alive=false;ready.current=false;player.current?.destroy();player.current=null;container.replaceChildren();};},[videoId,shouldLoad]);
 useEffect(()=>{if(!ready.current||!player.current)return;player.current.setVolume(Math.round(level*100));if(enabled){player.current.unMute();player.current.playVideo();}else player.current.pauseVideo();},[level,enabled]);
 return <aside className={`ir-youtube-box ${expanded?"":"is-minimized"}`} hidden={!enabled} inert={!enabled||!expanded} aria-hidden={!enabled||!expanded} aria-label="เครื่องเล่นเพลง YouTube"><header><span>เพลงประกอบ · YouTube</span><button type="button" aria-label="ซ่อนเครื่องเล่น YouTube โดยเล่นเพลงต่อ" title="ซ่อนเครื่องเล่น เพลงยังเล่นต่อ" onClick={onHide}><Minimize2 size={15}/></button></header><div ref={host}/></aside>;
}
