import type { DialogueBlock } from "@/lib/story/dialogueParser";

export type ReadingStatus = "idle" | "playing" | "paused";
type SpeechPort = Pick<SpeechSynthesis, "speak" | "cancel" | "resume">;
export type ReadingUpdate = { status: ReadingStatus; index: number; error?: string };

export function speechChunks(input: string): string[] {
  const text=input.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/https?:\/\/\S+/g,"").replace(/[*_`#]/g, "").trim();
  if (!text) return [];
  const segments=Array.from(new Intl.Segmenter("th",{granularity:"word"}).segment(text),part=>part.segment);
  const chunks:string[]=[];
  let chunk="";
  for (const segment of segments) {
    // A pasted URL or unbroken word can itself exceed the utterance limit.
    for (const piece of segment.match(/[\s\S]{1,220}/gu) || []) {
      if (chunk.length+piece.length>220) {if(chunk.trim()) chunks.push(chunk.trim());chunk="";}
      chunk+=piece;
    }
  }
  if (chunk.trim()) chunks.push(chunk.trim());
  return chunks;
}

/** Keep short utterances and invalidate callbacks after every cancel/seek. */
export class ReadAloudPlayback {
  private generation=0;
  private queue:{index:number;text:string}[]=[];
  private position=0;
  private status:ReadingStatus="idle";
  private voice:SpeechSynthesisVoice|null=null;
  private rate=1;
  private utterance:SpeechSynthesisUtterance|null=null;
  constructor(private synth:SpeechPort,private makeUtterance:(text:string)=>SpeechSynthesisUtterance,private notify:(update:ReadingUpdate)=>void) {}
  configure(voice:SpeechSynthesisVoice|null,rate:number) {
    this.voice=voice;this.rate=Math.max(0.5,Math.min(2,rate));
    if (this.status==="playing") {this.cancel();this.speakCurrent();}
  }
  play(blocks:DialogueBlock[],from=0) {
    this.cancel();
    this.queue=blocks.flatMap((block,index)=>index<from || block.type==="sound" ? [] : speechChunks((block.type==="dialogue" && block.speakerName ? `${block.speakerName}: `:"")+block.text).map(text=>({index,text})));
    this.position=0;
    this.speakCurrent();
  }
  pause() {
    if (this.status!=="playing") return;
    this.cancel();this.status="paused";this.emit();
  }
  resume() {if(this.status==="paused") this.speakCurrent();}
  stop() {this.cancel();this.queue=[];this.position=0;this.status="idle";this.emit();}
  dispose() {this.cancel();this.queue=[];this.status="idle";}
  private emit(error?:string) {this.notify({status:this.status,index:this.queue[this.position]?.index ?? -1,error});}
  private cancel() {this.generation++;this.synth.cancel();this.utterance=null;}
  private speakCurrent() {
    const item=this.queue[this.position];
    if (!item) {this.status="idle";this.emit();return;}
    const generation=this.generation;
    const utterance=this.makeUtterance(item.text);
    this.utterance=utterance;
    utterance.lang=this.voice?.lang || "th-TH";
    utterance.voice=this.voice;
    utterance.rate=this.rate;
    utterance.onstart=()=>{if(generation===this.generation) this.emit();};
    utterance.onend=()=>{if(generation!==this.generation) return;this.position++;this.speakCurrent();};
    utterance.onerror=event=>{
      if(generation!==this.generation) return;
      this.cancel();this.status="idle";
      this.emit(event.error==="not-allowed" ? "เบราว์เซอร์ไม่อนุญาตให้เล่นเสียง ลองกดฟังนิยายอีกครั้ง":"เล่นเสียงไม่สำเร็จ ลองเลือกเสียงอื่นหรือกดฟังใหม่");
    };
    this.status="playing";this.emit();
    try {
      this.synth.resume();
      this.synth.speak(utterance);
    } catch {
      this.cancel();this.status="idle";this.emit("Unable to start speech. Please select another voice and try again.");
    }
  }
}
