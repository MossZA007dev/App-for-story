export function musicPlaybackLevel(volume:number,muted:boolean,narrating:boolean){const value=Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):.25;return muted?0:value*(narrating?.24:1);}
export function isReaderVideo(media?:{filePath:string;provider?:string;metadata?:string|null}|null){
 if(!media)return false;
 if(media.provider==='video'||/\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(media.filePath))return true;
 try{const meta=JSON.parse(media.metadata||'{}');return meta?.type==='video'||meta?.mediaType==='video'||meta?.provider==='video'||meta?.isVideo===true;}catch{return false;}
}
export function readerVideoRange(metadata?:string|null,duration?:number){let meta:Record<string,unknown>={};try{meta=JSON.parse(metadata||'{}')||{};}catch{}
 const length=typeof duration==='number'&&Number.isFinite(duration)&&duration>0?duration:null;
 const raw=typeof meta.startTime==='number'&&Number.isFinite(meta.startTime)?Math.max(0,meta.startTime):0;
 const start=length!==null?Math.min(raw,Math.max(0,length-.1)):raw;
 const candidate=typeof meta.endTime==='number'&&Number.isFinite(meta.endTime)?meta.endTime:null;
 const end=candidate!==null&&candidate>start?(length===null?candidate:Math.min(candidate,length)):length;
 return {start,end};
}
