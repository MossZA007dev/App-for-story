import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {and,eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {scenes,parts,characters} from "@/lib/db/schema";
import {parseSceneToDialogueBlocks} from "@/lib/story/dialogueParser";
import {getElevenKey,buildSegments,generateSegment,subscription,modelRate,stockVoices,NarrationError} from "@/lib/audio/elevenlabs";
import {castVoice,sceneSpeakers} from "@/lib/audio/narrationCasting";
import {sourceHash,readAttachedNarration,attachNarration,attachedFilesReady} from "@/lib/audio/sceneNarration";
export const maxDuration=120;
export const dynamic="force-dynamic";
const voice=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const castingSchema=z.object({narrator:voice,male:voice,female:voice,overrides:z.record(z.string().max(500),z.union([voice,z.enum(["@male","@female","@narrator"])]))}).refine(value=>Object.keys(value.overrides).length<=200);
const schema=z.object({voiceId:voice.optional(),casting:castingSchema.optional(),previewSpeaker:z.string().max(500).optional(),mode:z.enum(["preview","scene"]),text:z.string().trim().min(1).max(300).optional(),action:z.enum(["plan","generate","attach"]),segmentIndex:z.number().int().min(0).max(1000).optional(),sourceVersion:z.string().max(100).optional(),sourceHash:z.string().max(100).optional()});
type Params={params:Promise<{id:string;sceneId:string}>};
async function context({params}:Params) {
  const {id,sceneId}=await params;
  const row=db.select({scene:scenes}).from(scenes).innerJoin(parts,eq(scenes.partId,parts.id)).where(and(eq(scenes.id,sceneId),eq(parts.projectId,id))).get();
  if(!row)return null;
  const cast=db.select().from(characters).where(eq(characters.projectId,id)).all();
  const blocks=parseSceneToDialogueBlocks(row.scene.contentMarkdown || "",cast as any);
  return {id,sceneId,scene:row.scene,blocks,speakers:sceneSpeakers(blocks),hash:sourceHash(blocks)};
}
export async function GET(_request:NextRequest,params:Params) {
  const data=await context(params);
  if(!data)return NextResponse.json({error:"ไม่พบฉากนี้"},{status:404});
  const attached=await readAttachedNarration(data.id,data.sceneId);
  const stale=Boolean(attached && attached.sourceHash!==data.hash);
  const ready=attached ? await attachedFilesReady(attached):false;
  return NextResponse.json({speakers:data.speakers,sourceHash:data.hash,attached:attached ? {...attached,ready,stale}:null},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest,params:Params) {
  const input=schema.safeParse(await request.json().catch(()=>null));
  if(!input.success || (!input.data.casting && !input.data.voiceId) || (input.data.mode==="preview" && !input.data.text))return NextResponse.json({error:"เลือกเสียงและข้อความทดลองไม่เกิน 300 ตัวอักษร"},{status:400});
  const data=await context(params);
  if(!data)return NextResponse.json({error:"ไม่พบฉากนี้"},{status:404});
  if((data.scene.contentMarkdown || "").length>80000)return NextResponse.json({error:"แบ่งฉากให้สั้นกว่า 80,000 ตัวอักษรก่อนสร้างเสียง"},{status:400});
  if(input.data.action!=="plan" && (input.data.sourceVersion!==data.scene.updatedAt || (input.data.sourceHash && input.data.sourceHash!==data.hash)))return NextResponse.json({error:"เนื้อหาหรือข้อมูลผู้พูดเปลี่ยนแล้ว กรุณาเตรียมเสียงใหม่"},{status:409});
  try {
    const casting=input.data.casting || {narrator:input.data.voiceId!,male:input.data.voiceId!,female:input.data.voiceId!,overrides:{}};
    const speaker=data.speakers.find(s=>s.key===(input.data.previewSpeaker || "narrator"));
    if(input.data.mode==="preview" && !speaker)throw new NarrationError("ไม่พบผู้พูดที่เลือก กรุณาโหลดฉากใหม่");
    const segments=await buildSegments(data.blocks,castVoice(speaker || data.speakers[0],casting),input.data.mode==="preview" ? input.data.text:undefined,casting);
    if(!segments.length)throw new NarrationError("ยังไม่มีคำบรรยายหรือบทสนทนาให้อ่าน");
    if(input.data.action==="attach") {
      if(input.data.sourceHash!==data.hash)return NextResponse.json({error:"กรุณาเตรียมเสียงจากบทล่าสุดก่อนใส่ในฉาก"},{status:409});
      if(segments.some(s=>!s.cached))throw new NarrationError("ยังสร้างเสียงไม่ครบ กดสร้างต่อก่อนใส่ในฉาก");
      const attached={version:1 as const,kind:input.data.mode,casting,sourceHash:data.hash,attachedAt:new Date().toISOString(),segments,...(input.data.mode==="preview" ? {sample:input.data.text,previewSpeaker:input.data.previewSpeaker}:{})};
      await attachNarration(data.id,data.sceneId,attached);
      return NextResponse.json({attached:{...attached,ready:true,stale:false}});
    }
    const key=await getElevenKey();
    if(input.data.action==="plan") {
      const missing=segments.filter(s=>!s.cached);
      const result={segments,sourceVersion:data.scene.updatedAt,sourceHash:data.hash,casting};
      if(!missing.length)return NextResponse.json({...result,credits:0,remaining:null});
      if(!key)throw new NarrationError("เพิ่ม ElevenLabs API Key ในหน้าตั้งค่าก่อน");
      const [quota,rate,voices]=await Promise.all([subscription(key),modelRate(key),stockVoices(key)]);
      if(!["free","starter"].includes(quota.tier))throw new NarrationError("โหมดนี้รองรับบัญชี Free และ Starter โดยใช้เครดิตในแพ็กเกจเท่านั้น");
      if(missing.some(s=>!voices.some((v:{id:string})=>v.id===s.voiceId)))throw new NarrationError("มีเสียงที่ไม่พร้อมใช้งาน กรุณาเลือกเสียงใหม่ให้ผู้พูด");
      const credits=missing.reduce((sum,s)=>sum+Math.ceil(s.text.length*rate),0);
      if(credits>quota.remaining)throw new NarrationError(`ต้องใช้ประมาณ ${credits.toLocaleString()} เครดิต แต่เหลือ ${quota.remaining.toLocaleString()} ลองข้อความสั้นลงหรือรอโควตารอบใหม่`);
      return NextResponse.json({...result,credits,remaining:quota.remaining});
    }
    const segment=segments[input.data.segmentIndex ?? -1];
    if(!segment)throw new NarrationError("ไม่พบข้อความที่ต้องการสร้างเสียง");
    if(!segment.cached && !key)throw new NarrationError("เพิ่ม API Key ก่อนสร้างเสียง");
    return NextResponse.json({segment:await generateSegment(key,segment.voiceId!,segment)});
  }catch(error){return NextResponse.json({error:error instanceof NarrationError ? error.message:"สร้างเสียงไม่สำเร็จ ไฟล์ที่สร้างแล้วจะยังอยู่ กรุณาลองใหม่"},{status:400});}
}
