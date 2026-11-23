/** Small deterministic PCM sounds generated locally; no API, fetch or external assets. */
export function builtinSfxUrl(kind:string){
 const rate=22050,duration=kind==='rain'||kind==='wind'?3:kind==='thunder'?2:kind==='blade'?.65:.45,count=Math.floor(rate*duration),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
 const word=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};word(0,'RIFF');view.setUint32(4,36+count*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,count*2,true);
 let seed=93717,low=0;for(let i=0;i<count;i++){const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low=low*.94+noise*.06;let sample=0;
  if(kind==='rain')sample=noise*.15+low*.35;
  else if(kind==='wind')sample=low*(.6+.3*Math.sin(t*Math.PI*2/3));
  else if(kind==='thunder')sample=(low*2+noise*.12)*Math.exp(-t*2.2);
  else if(kind==='blade')sample=(noise*.3+Math.sin(t*2*Math.PI*(1600-t*700))*.16)*Math.sin(Math.PI*t/duration)*Math.exp(-t*3);
  else if(kind==='step')sample=(low*2+noise*.12+Math.sin(t*2*Math.PI*85)*.22)*Math.exp(-t*24);
  else sample=(Math.sin(t*2*Math.PI*(110-t*45))*.5+low*.7)*Math.exp(-t*14);
  const fade=Math.min(1,i/100,(count-i)/150);view.setInt16(44+i*2,Math.max(-1,Math.min(1,sample*fade))*32767,true);
 }
 return URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
}
