import crypto from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, characters, parts, episodes, scenes, continuityLedgers } from "@/lib/db/schema";
import { DEFAULT_STORY_RULES } from "@/lib/templates/defaultStoryRules";
import { MAX_IMPORT_TEXT, StoryImportDraftSchema } from "./storyImport";

export const CreateStoryImportSchema = z.object({
  requestId: z.string().uuid(),
  sourceText: z.string().trim().min(1).max(MAX_IMPORT_TEXT),
  draft: StoryImportDraftSchema,
}).superRefine(({draft},ctx)=>{
  if (!draft.title.trim()) ctx.addIssue({code:"custom",path:["draft","title"],message:"กรุณาระบุชื่อเรื่อง"});
  if (!draft.universe.trim()) ctx.addIssue({code:"custom",path:["draft","universe"],message:"กรุณาระบุจักรวาล"});
});

/** One transaction: an import either creates the complete story or writes nothing. */
export function createImportedStory(input: z.infer<typeof CreateStoryImportSchema>) {
  const {requestId:projectId,draft,sourceText} = CreateStoryImportSchema.parse(input);
  const fingerprint=crypto.createHash("sha256").update(JSON.stringify(draft)).digest("hex");
  const worldNotes=[draft.worldNotes.trim(),"## ข้อความต้นฉบับที่นำเข้า",sourceText,`<!-- saga-import:${fingerprint} -->`].filter(Boolean).join("\n\n");
  return db.transaction(tx=>{
    const existing=tx.select().from(projects).where(eq(projects.id,projectId)).get();
    if (existing) {
      if (existing.title!==draft.title.trim() || existing.universe!==draft.universe.trim() || existing.worldNotes!==worldNotes) throw new Error("คำขอซ้ำมีข้อมูลไม่ตรงกัน กรุณาโหลดหน้าใหม่");
      return {projectId,reused:true};
    }
    const now=new Date().toISOString();
    tx.insert(projects).values({id:projectId,title:draft.title.trim(),universe:draft.universe.trim(),timelineScope:draft.timelineScope,theme:draft.theme,worldNotes,storyRules:DEFAULT_STORY_RULES,styleGuide:"cinematic composition, atmospheric lighting, film still, highly detailed",createdAt:now,updatedAt:now}).run();
    draft.characters.forEach(c=>{
      const id=crypto.randomUUID();
      tx.insert(characters).values({id,projectId,name:c.name,realNickname:c.realNickname || c.name,characterType:c.characterType,gender:c.gender,startMbti:c.startMbti,currentMbti:c.startMbti,faction:c.faction,chosenRole:c.chosenRole,background:c.background,status:"alive",createdAt:now,updatedAt:now}).run();
    });
    let firstPartId="";
    const importedParts=draft.parts.length ? draft.parts : [{title:"ภาคที่ 1",scope:draft.timelineScope,notes:"",status:"planned" as const,scenes:[]}];
    importedParts.forEach((part,index)=>{
      const partId=crypto.randomUUID();
      if (!firstPartId) firstPartId=partId;
      tx.insert(parts).values({id:partId,projectId,number:index+1,title:part.title,scope:part.scope,status:part.scenes.length ? part.status:"planned",characterChangeSummary:part.notes,createdAt:now,updatedAt:now}).run();
      const episodeId=crypto.randomUUID();
      tx.insert(episodes).values({id:episodeId,projectId,partId,number:1,title:part.title,createdAt:now,updatedAt:now}).run();
      part.scenes.forEach((scene,sceneIndex)=>{
        tx.insert(scenes).values({id:crypto.randomUUID(),partId,episodeId,order:sceneIndex+1,title:scene.title,location:scene.location,contentMarkdown:scene.contentMarkdown,charactersPresent:"[]",wordCount:scene.contentMarkdown.trim().split(/\s+/).filter(Boolean).length,createdAt:now,updatedAt:now}).run();
      });
    });
    tx.insert(continuityLedgers).values({id:crypto.randomUUID(),projectId,partId:firstPartId,isCurrent:1,ledgerData:JSON.stringify({deaths:[],injuries_scars:[],who_knows_whom:[],possessions_secrets:[],locations:{},canon_deviations:[],open_threads:[]}),createdAt:now}).run();
    return {projectId,reused:false};
  });
}
