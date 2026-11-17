import { z } from "zod";

export const MAX_IMPORT_TEXT = 80_000;
const short = z.string().max(500).default("");
export const ImportedCharacterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  realNickname: short,
  characterType: z.enum(["self", "friend", "canon"]).default("friend"),
  gender: short,
  startMbti: short,
  faction: short,
  chosenRole: z.string().max(5000).default(""),
  background: z.string().max(15000).default(""),
});
export const ImportedSceneSchema = z.object({
  title: z.string().trim().min(1).max(500),
  location: short,
  contentMarkdown: z.string().max(MAX_IMPORT_TEXT).default(""),
});
export const StoryImportDraftSchema = z.object({
  title: short,
  universe: short,
  timelineScope: short,
  theme: z.string().max(5000).default(""),
  worldNotes: z.string().max(MAX_IMPORT_TEXT).default(""),
  characters: z.array(ImportedCharacterSchema).max(100).default([]),
  parts: z.array(z.object({
    title: z.string().trim().min(1).max(500),
    scope: short,
    notes: z.string().max(MAX_IMPORT_TEXT).default(""),
    status: z.enum(["planned", "drafting"]).default("drafting"),
    scenes: z.array(ImportedSceneSchema).max(200).default([]),
  })).max(30).default([]),
}).superRefine((draft, ctx) => {
  if (draft.parts.reduce((n,p) => n + p.scenes.reduce((sum,s) => sum+s.contentMarkdown.length,0), 0) > MAX_IMPORT_TEXT * 2) ctx.addIssue({code:"custom",message:"เนื้อหาฉากที่นำเข้ายาวเกินกำหนด กรุณาแบ่งนำเข้า"});
  if (draft.parts.reduce((n,p) => n + p.scenes.length, 0) > 200) ctx.addIssue({code: "custom", message: "นำเข้าได้ไม่เกิน 200 ฉากต่อครั้ง"});
});
export type StoryImportDraft = z.infer<typeof StoryImportDraftSchema>;
export type ImportedCharacter = z.infer<typeof ImportedCharacterSchema>;

const clean = (text: string) => text.replace(/\*\*|__/g, "").replace(/^\s*#{1,6}\s*/, "").trim();
const fieldAliases = {
  name: /^(?:ตัวละคร|ชื่อตัวละคร|ชื่อ|character|name|nickname|ชื่อเล่น)$/i,
  realNickname: /^(?:ชื่อเล่นจริง|realnickname|real nickname|ชื่อเล่น)$/i,
  faction: /(?:house|faction|ฝ่าย|สังกัด|ตระกูล|บ้าน)/i,
  startMbti: /(?:mbti|บุคลิก|personality)/i,
  chosenRole: /(?:role|บทบาท|หน้าที่|ความสามารถ|ability|skill|พลัง)/i,
  background: /(?:background|ภูมิหลัง|ปูมหลัง|ประวัติ)/i,
  gender: /^(?:gender|เพศ)$/i,
  characterType: /^(?:type|ประเภท)$/i,
};
const partHeading = /^(?:ภาค(?:ที่)?|ปี(?:ที่)?|ซีซั่น|season|part|year)\s*[0-9๐-๙]+\s*[:：.\-–—]?\s*/i;
const sceneHeading = /^(?:ฉาก(?:ที่)?|ตอน(?:ที่)?|บท(?:ที่)?|scene|chapter|episode|ep)\s*[0-9๐-๙]+\s*[:：.\-–—]?\s*/i;
const cells = (line: string) => line.includes("\t") ? line.split("\t").map(clean) : line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map(v => clean(v.replace(/\\\|/g,"|")));
const isTable = (line: string) => line.includes("|") || line.includes("\t");

/** Conservative extraction: keep scene prose verbatim and never mix later character logs into starting profiles. */
export function parseStoryImport(input: string): { draft: StoryImportDraft; warnings: string[] } {
  if (!input.trim()) throw new Error("วางข้อความที่ต้องการนำเข้าก่อน");
  if (input.length > MAX_IMPORT_TEXT) throw new Error("ข้อความยาวเกิน 80,000 ตัวอักษร กรุณาแบ่งนำเข้า");
  const text=input.replace(/\r\n?/g,"\n").trim();
  const json=text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  if (json.startsWith("{")) {
    try { return {draft:StoryImportDraftSchema.parse(JSON.parse(json)),warnings:[]}; }
    catch { /* Continue as prose when the entire document is not a valid draft. */ }
  }
  const draft:StoryImportDraft=StoryImportDraftSchema.parse({});
  const warnings:string[]=[];
  const lines=text.split("\n");
  const firstNarrative=lines.findIndex(line=>partHeading.test(clean(line)) || sceneHeading.test(clean(line)));
  const preludeEnd=firstNarrative<0 ? lines.length:firstNarrative;
  const prelude=lines.slice(0,preludeEnd);
  const consumed=new Set<number>();
  const characters=new Map<string,ImportedCharacter>();
  const metadata:Record<string,RegExp>={
    title:/^(?:ชื่อเรื่อง|ชื่อนิยาย|ชื่อโปรเจกต์|title|story title)\s*[:：]\s*(.+)$/i,
    universe:/^(?:จักรวาล(?:ตั้งต้น)?|universe|fandom)\s*[:：]\s*(.+)$/i,
    timelineScope:/^(?:ขอบเขตเวลา|ไทม์ไลน์|ช่วงเวลา|timeline(?: scope)?)\s*[:：]\s*(.+)$/i,
    theme:/^(?:ธีม(?:หลัก)?|โทนเรื่อง|theme|tone)\s*[:：]\s*(.+)$/i,
  };
  prelude.forEach((line,index)=>{
    const value=clean(line);
    for (const [key,pattern] of Object.entries(metadata)) {
      const match=value.match(pattern);
      if (match) { (draft as unknown as Record<string,string>)[key]=match[1].trim();consumed.add(index); }
    }
    if (!draft.title && /^#\s+/.test(line)) { draft.title=value;consumed.add(index); }
  });
  // Only profile tables before the narrative establish initial character state.
  for (let i=0;i<prelude.length;i++) {
    if (!isTable(prelude[i])) continue;
    const headers=cells(prelude[i]);
    if (headers.some(h=>/ตอนนี้|ล่าสุด|ปัจจุบัน|สูญเสีย|ความเชื่อ|current|loss|belief/i.test(h))) continue;
    const columns=Object.fromEntries(Object.entries(fieldAliases).map(([key,re])=>[key,headers.findIndex(h=>re.test(h))]));
    if (columns.name<0 || !Object.entries(columns).some(([key,value])=>key!=="name" && value>=0)) continue;
    consumed.add(i);
    let j=i+1;
    for (;j<prelude.length && isTable(prelude[j]);j++) {
      consumed.add(j);
      const row=cells(prelude[j]);
      if (row.every(cell=>/^[:\-\s]*$/.test(cell))) continue;
      const name=row[columns.name]?.trim();
      if (!name || row.length<2) continue;
      const record:Record<string,string>={name,realNickname:name};
      for (const [key,index] of Object.entries(columns)) if (index>=0 && row[index]) record[key]=row[index];
      const type=record.characterType?.toLowerCase() || "";
      record.characterType=/canon|ต้นฉบับ/.test(type) ? "canon":/self|ตัวฉัน|ของฉัน/.test(type) ? "self":"friend";
      if (columns.chosenRole>=0 && /พัฒนา|future|develop/i.test(headers[columns.chosenRole]) && record.chosenRole) record.chosenRole=`แนวทางพัฒนา: ${record.chosenRole}`;
      const character=ImportedCharacterSchema.parse(record);
      const key=name.toLocaleLowerCase();
      const previous=characters.get(key);
      // Repeated tables can fill missing values, but cannot replace initial facts.
      characters.set(key,previous ? {...character,...Object.fromEntries(Object.entries(previous).filter(([,value])=>Boolean(value)))}:character);
    }
    i=j-1;
  }
  let current:ImportedCharacter|undefined;
  prelude.forEach((line,index)=>{
    if (consumed.has(index)) return;
    const value=clean(line).replace(/^[-*•]\s*/,"");
    const start=value.match(/^(?:ตัวละคร|ชื่อตัวละคร|character)\s*[:：]\s*(.+)$/i);
    if (start) { current=characters.get(start[1].toLocaleLowerCase()) || ImportedCharacterSchema.parse({name:start[1],realNickname:start[1]});characters.set(current.name.toLocaleLowerCase(),current);return; }
    if (/^#{1,6}\s/.test(line)) current=undefined;
    const pair=value.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (!current || !pair) return;
    for (const [key,re] of Object.entries(fieldAliases)) if (key!=="name" && key!=="characterType" && re.test(pair[1])) (current as unknown as Record<string,string>)[key]=pair[2];
  });
  const prose=prelude.filter((_,index)=>!consumed.has(index)).join("\n");
  if (characters.size) {
    const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const names=Array.from(characters.values()).map(c=>escape(c.name)).sort((a,b)=>b.length-a.length).join("|");
    const matches=Array.from(prose.matchAll(new RegExp(`(^|[\\s])(${names})(?=\\s*(?:เป็น|คือ))`,"gim")));
    matches.forEach((match,index)=>{
      const character=characters.get(match[2].toLocaleLowerCase());
      if (character && !character.background) character.background=prose.slice(match.index!+match[1].length,matches[index+1]?.index ?? prose.length).split(/\n\s*#{1,6}\s/)[0].trim();
    });
  }
  draft.characters=Array.from(characters.values());
  draft.worldNotes=prelude.filter((_,index)=>!consumed.has(index)).join("\n").trim();
  if (!draft.theme) {
    const tagline=prelude.find(line=>/\S\s*\|\s*\S/.test(line) && !/^\s*\|/.test(line) && !/\]\(https?:/.test(line) && /[•]|fantasy|drama|friendship|tragedy|ผจญภัย|มิตรภาพ|ดราม่า/i.test(line));
    if (tagline) draft.theme=tagline.slice(tagline.indexOf("|")+1).trim();
  }
  if (!draft.universe) {
    if (/harry\s+potter|hogwarts|gryffindor|slytherin|hufflepuff|ravenclaw|แฮร์รี่\s*พอตเตอร์|ฮอกวอตส์/i.test(text)) draft.universe="Harry Potter";
    else if (/game\s+of\s+thrones|house\s+(?:stark|targaryen|lannister)|มหาศึกชิงบัลลังก์/i.test(text)) draft.universe="Game of Thrones";
    if (draft.universe) warnings.push("จักรวาลถูกระบุจากคำในข้อความ กรุณาตรวจสอบก่อนสร้าง");
  }

  type Part=StoryImportDraft['parts'][number];
  type Section={index:number;title:string;kind:"part"|"scene"|"notes"|"future"};
  const boundaries:Section[]=[];
  const noteHeading=/^(?:บันทึก(?:การเปลี่ยนแปลง|ท้าย|สิ้น)|สรุป(?:สิ้น|ท้าย|พัฒนาการ)|character\s+(?:changes|development)|end.of.year)/i;
  const futureHeading=/^(?:สิ่งที่วางไว้ให้ตอนต่อไป|โครง(?:เรื่อง|ร่าง)(?:ภาค|ตอน|ปี)?(?:ถัดไป|ต่อไป)|แผน(?:ภาค|ตอน|ปี)(?:ถัดไป|ต่อไป)|next\s+(?:part|year|chapter)|upcoming)/i;
  lines.forEach((line,index)=>{
    const value=clean(line);
    if (partHeading.test(value)) boundaries.push({index,title:value,kind:"part"});
    else if (sceneHeading.test(value)) boundaries.push({index,title:value,kind:"scene"});
    else if (/^#{1,6}\s/.test(line) && futureHeading.test(value)) boundaries.push({index,title:value,kind:"future"});
    else if (/^#{1,6}\s/.test(line) && noteHeading.test(value)) boundaries.push({index,title:value,kind:"notes"});
  });
  let narrativeEnd=lines.length;
  let last=lines.length-1;
  while (last>=0 && !lines[last].trim()) last--;
  if (last>=0 && /^ต่อ(?:ภาค|ตอน)(?:ถัดไป|ต่อไป)(?:ได้เลย|เลย|ให้หน่อย)[.!\s]*$/.test(lines[last].trim())) {
    narrativeEnd=last;
    warnings.push("แยกคำขอสนทนาท้ายข้อความออกจากเนื้อเรื่องแล้ว โดยยังเก็บไว้ในต้นฉบับ");
  }
  const newPart=(title:string,status:Part['status']="drafting"):Part=>({title,scope:"",notes:"",status,scenes:[]});
  const addNote=(part:Part,heading:string,body:string)=>{part.notes=[part.notes,`## ${heading}`,body].filter(Boolean).join("\n\n");};
  let activePart:Part|undefined;
  let planning=false;
  boundaries.forEach((section,index)=>{
    if (section.index>=narrativeEnd) return;
    const end=Math.min(boundaries[index+1]?.index ?? narrativeEnd,narrativeEnd);
    const content=lines.slice(section.index+1,end).join("\n").trim();
    if (section.kind==="part") {
      activePart=newPart(section.title,planning ? "planned":"drafting");
      draft.parts.push(activePart);
      const scope=content.split("\n").find(line=>/^\s*[0-9๐-๙]{4}\s*[–—-]\s*[0-9๐-๙]{4}/.test(line));
      if (scope) activePart.scope=scope.split("|")[0].trim();
      if (content) {
        const hasScenes=boundaries.slice(index+1).find(item=>item.kind==="scene" || item.kind==="part" || item.kind==="notes" || item.kind==="future")?.kind==="scene";
        if (planning || hasScenes) addNote(activePart,planning ? "โครงเรื่องที่วางไว้":"เกริ่นภาค",content);
        else activePart.scenes.push({title:section.title,location:"",contentMarkdown:content});
      }
    } else if (section.kind==="notes" || section.kind==="future") {
      if (activePart) addNote(activePart,section.title,content);
      else draft.worldNotes=[draft.worldNotes,`## ${section.title}`,content].filter(Boolean).join("\n\n");
      if (section.kind==="future") planning=true;
    } else {
      if (!activePart) {activePart=newPart("ภาคที่ 1");draft.parts.push(activePart);}
      if (planning) {addNote(activePart,section.title,content);return;}
      const location=content.split("\n").map(clean).map(line=>line.match(/^(?:สถานที่|location|place)\s*[:：]\s*(.*)$/i)).find(Boolean)?.[1] || "";
      activePart.scenes.push({title:section.title,location,contentMarkdown:content});
    }
  });
  if (!draft.parts.length) draft.parts=[{...newPart("ภาคที่ 1"),scenes:[{title:"เนื้อหาที่นำเข้า",location:"",contentMarkdown:lines.slice(0,narrativeEnd).join("\n").trim()}]}];
  if (!draft.timelineScope) draft.timelineScope=draft.parts.find(part=>part.scope)?.scope || "";

  // Register actual dialogue speakers, without inventing profiles for mere name mentions.
  const speakerNames=new Set<string>();
  draft.parts.flatMap(part=>part.scenes).forEach(scene=>{
    scene.contentMarkdown.split("\n").forEach(line=>{
      const match=clean(line).match(/^([\p{L}][\p{L}\p{M}\s.'’\-]{0,79})\s*[:：]\s*\S/u);
      if (match && !/^(?:สถานที่|location|place|เวลา|time|เสียง(?:ประกอบ)?|sound|sfx|bgm|music|ผู้บรรยาย|narrator)$/i.test(match[1].trim())) speakerNames.add(match[1].trim());
    });
  });
  const candidates=Array.from(speakerNames);
  const added:string[]=[];
  candidates.forEach(name=>{
    const key=name.toLocaleLowerCase();
    if (characters.has(key)) return;
    const longer=candidates.filter(other=>other.toLocaleLowerCase().endsWith(" "+key));
    const canonical=longer.length===1 ? longer[0]:name;
    if (characters.has(canonical.toLocaleLowerCase())) return;
    characters.set(canonical.toLocaleLowerCase(),ImportedCharacterSchema.parse({name:canonical,realNickname:canonical,characterType:"canon",chosenRole:"ผู้พูดที่พบในเนื้อเรื่องต้นฉบับ"}));
    added.push(canonical);
  });
  draft.characters=Array.from(characters.values());
  if (added.length) warnings.push(`พบผู้พูดเพิ่มเติม ${added.length} คน: ${added.join(", ")} แยกไว้เป็นตัวละครต้นฉบับ กรุณาตรวจประเภท`);
  if (!draft.title) warnings.push("ไม่พบชื่อเรื่อง กรุณาตั้งชื่อในตัวอย่างด้านล่าง");
  if (!draft.universe) warnings.push("ไม่พบจักรวาล กรุณาระบุก่อนสร้าง");
  if (!draft.characters.length) warnings.push("ยังแยกตัวละครไม่ได้ ลองใช้ AI ช่วยแยก หรือเพิ่มตัวละครในตัวอย่าง");
  warnings.push("เนื้อหาฉากเก็บจากต้นฉบับโดยตรง บันทึกท้ายภาคและข้อความต้นฉบับทั้งหมดจะถูกเก็บไว้ด้วย");
  return {draft:StoryImportDraftSchema.parse(draft),warnings};
}

/** AI may enrich metadata, but must never replace or shorten the source scenes. */
export function mergeStoryImportMetadata(source:string,metadata:unknown) {
  const local=parseStoryImport(source);
  const ai=StoryImportDraftSchema.parse({...((metadata && typeof metadata==="object") ? metadata:{}),parts:[]});
  const fields=["title","universe","timelineScope","theme"] as const;
  for (const key of fields) if (!local.draft[key]) local.draft[key]=ai[key];
  const originals=new Set(local.draft.characters.map(c=>c.name.toLocaleLowerCase()));
  const sourceLower=source.toLocaleLowerCase();
  local.draft.characters=local.draft.characters.map(character=>{
    const extra=ai.characters.find(c=>c.name.toLocaleLowerCase()===character.name.toLocaleLowerCase());
    if (!extra) return character;
    return {...extra,...Object.fromEntries(Object.entries(character).filter(([,value])=>Boolean(value)))} as ImportedCharacter;
  });
  ai.characters.forEach(character=>{
    if (!originals.has(character.name.toLocaleLowerCase()) && sourceLower.includes(character.name.toLocaleLowerCase())) {local.draft.characters.push(character);originals.add(character.name.toLocaleLowerCase());}
  });
  if (ai.worldNotes && ai.worldNotes!==local.draft.worldNotes) local.draft.worldNotes=[local.draft.worldNotes,"## ข้อมูลเพิ่มเติมที่ AI แยกได้",ai.worldNotes].filter(Boolean).join("\n\n");
  return {draft:StoryImportDraftSchema.parse(local.draft),warnings:local.warnings.filter(warning=>!((local.draft.title && warning.startsWith("ไม่พบชื่อเรื่อง")) || (local.draft.universe && warning.startsWith("ไม่พบจักรวาล")))).concat("AI ช่วยเฉพาะข้อมูลประกอบ เนื้อหาฉากยังคงตามต้นฉบับ กรุณาตรวจข้อมูลก่อนสร้าง")};
}
