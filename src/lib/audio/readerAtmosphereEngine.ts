import type {AtmosphereKind} from '@/lib/story/readerAtmosphere';
/** Synthesized sound textures: no downloads, third-party audio or API calls. */
export class ReaderAtmosphereEngine {
 private context:AudioContext;
 private master:GainNode;
 private layers:{gain:GainNode;nodes:AudioNode[];sources:AudioScheduledSourceNode[]}[]=[];
 private kind:AtmosphereKind='none';
 private timers:ReturnType<typeof setTimeout>[]=[];
 private disposed=false;
 constructor(){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);}
 async pause(){if(!this.disposed)await this.context.suspend();}
 async resume(){if(!this.disposed)await this.context.resume();}
 setLevel(level:number){if(this.disposed)return;const now=this.context.currentTime;this.master.gain.cancelScheduledValues(now);this.master.gain.setTargetAtTime(Math.max(0,Math.min(.22,level)),now,.3);}
 setKind(kind:AtmosphereKind){
  if(this.disposed||kind===this.kind)return;this.kind=kind;
  const old=this.layers;this.layers=[];
  for(const l of old){l.gain.gain.setTargetAtTime(0,this.context.currentTime,.2);const timer=setTimeout(()=>{for(const s of l.sources){try{s.stop();}catch{}}for(const n of l.nodes)n.disconnect();l.gain.disconnect();},900);this.timers.push(timer);}
  if(kind==='none')return;
  const ctx=this.context,gain=ctx.createGain(),filter=ctx.createBiquadFilter(),source=ctx.createBufferSource();
  const buffer=ctx.createBuffer(2,ctx.sampleRate*4,ctx.sampleRate);
  for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let smooth=0;for(let i=0;i<data.length;i++){const noise=Math.random()*2-1;smooth=(smooth+.025*noise)/1.025;data[i]=kind==='rain'?noise*.28:smooth*3.2;}}
  source.buffer=buffer;source.loop=true;
  filter.type=kind==='rain'?'lowpass':'bandpass';filter.frequency.value=kind==='rain'?2600:kind==='fire'?460:kind==='train'?220:360;filter.Q.value=.4;
  gain.gain.value=0;gain.connect(this.master);source.connect(filter);filter.connect(gain);
  const nodes:AudioNode[]=[source,filter],sources:AudioScheduledSourceNode[]=[source];
  // Slow volume modulation gives texture without sharp transients or surprise sounds.
  const pulse=ctx.createOscillator(),depth=ctx.createGain();pulse.type='sine';pulse.frequency.value=kind==='train'?2.6:kind==='fire'?.7:.12;depth.gain.value=kind==='train'?.22:.12;pulse.connect(depth);depth.connect(gain.gain);nodes.push(pulse,depth);sources.push(pulse);
  gain.gain.setTargetAtTime(.7,ctx.currentTime,.5);source.start();pulse.start();this.layers.push({gain,nodes,sources});
 }
 async dispose(){if(this.disposed)return;this.disposed=true;for(const timer of this.timers)clearTimeout(timer);this.master.gain.value=0;await this.context.close().catch(()=>{});this.layers=[];}
}
