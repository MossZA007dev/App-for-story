import type {DialogueBlock} from "@/lib/story/dialogueParser";
export type VoiceCasting={narrator:string;male:string;female:string;overrides:Record<string,string>};
export type NarrationSpeaker={key:string;name:string;gender:"male"|"female"|"unknown";lines:number};
export function normalizeGender(value?:string|null):NarrationSpeaker['gender'] {
  const gender=(value || "").trim().toLowerCase();
  if(/^(หญิง|ผู้หญิง|female|woman|f)$/.test(gender)) return "female";
  if(/^(ชาย|ผู้ชาย|male|man|m)$/.test(gender)) return "male";
  return "unknown";
}
export function speakerOf(block:DialogueBlock):Omit<NarrationSpeaker,'lines'> {
  if(block.type==="narration" || block.isNarrator || /^(ผู้บรรยาย|narrator)$/i.test(block.speakerName || "")) return {key:"narrator",name:"ผู้บรรยาย",gender:"unknown"};
  const name=block.speaker?.name || block.speakerName || "ไม่ระบุผู้พูด";
  return {key:block.speaker?.id && !block.speaker.id.startsWith("temp-") ? `character:${block.speaker.id}`:`name:${name.toLowerCase()}`,name,gender:normalizeGender(block.speaker?.gender)};
}
export function sceneSpeakers(blocks:DialogueBlock[]):NarrationSpeaker[] {
  const speakers=new Map<string,NarrationSpeaker>();
  speakers.set("narrator",{key:"narrator",name:"ผู้บรรยาย",gender:"unknown",lines:0});
  for(const block of blocks) {if(block.type==="sound")continue;const speaker=speakerOf(block);const previous=speakers.get(speaker.key);speakers.set(speaker.key,{...speaker,lines:(previous?.lines || 0)+1});}
  return [...speakers.values()];
}
export function castVoice(speaker:Pick<NarrationSpeaker,'key'|'gender'>,casting:VoiceCasting):string {
  if(speaker.key==="narrator")return casting.narrator;
  const override=casting.overrides[speaker.key];
  if(override==="@male")return casting.male;
  if(override==="@female")return casting.female;
  if(override==="@narrator")return casting.narrator;
  return override || (speaker.gender==="male" ? casting.male:speaker.gender==="female" ? casting.female:casting.narrator);
}
