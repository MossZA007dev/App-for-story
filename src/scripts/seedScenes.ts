import { db } from "../lib/db";
import { projects, parts, scenes, sceneVersions, images, characters } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function run() {
  const allProjects = db.select().from(projects).all();
  if (allProjects.length === 0) {
    console.log("No project found to seed scenes");
    return;
  }

  const project = allProjects[0];
  const allParts = db.select().from(parts).where(eq(parts.projectId, project.id)).all();
  if (allParts.length === 0) return;

  const part1 = allParts[0];
  const existingScenes = db.select().from(scenes).where(eq(scenes.partId, part1.id)).all();

  // Update existing characters to show "Self" and "Friend" badges
  const charList = db.select().from(characters).where(eq(characters.projectId, project.id)).all();
  if (charList.length > 0) {
    // 1st character is "Self"
    db.update(characters)
      .set({ characterType: "self", realNickname: "มอส" })
      .where(eq(characters.id, charList[0].id))
      .run();

    // 2nd and 3rd are "Friend"
    if (charList[1]) {
      db.update(characters)
        .set({ characterType: "friend", realNickname: "นนท์" })
        .where(eq(characters.id, charList[1].id))
        .run();
    }
    if (charList[2]) {
      db.update(characters)
        .set({ characterType: "friend", realNickname: "ก้อย" })
        .where(eq(characters.id, charList[2].id))
        .run();
    }
    // 4th, 5th, 6th are "Canon"
    if (charList[3]) {
      db.update(characters).set({ characterType: "canon" }).where(eq(characters.id, charList[3].id)).run();
    }
    if (charList[4]) {
      db.update(characters).set({ characterType: "canon" }).where(eq(characters.id, charList[4].id)).run();
    }
    if (charList[5]) {
      db.update(characters).set({ characterType: "canon" }).where(eq(characters.id, charList[5].id)).run();
    }
  }

  if (existingScenes.length > 0) {
    console.log("Scenes already exist, skipping scene seeding.");
    return;
  }

  console.log("Seeding initial scenes and movie stills...");
  const now = new Date().toISOString();

  // Scene 1: The Ash Upon Blackwater Bay
  const scene1Id = crypto.randomUUID();
  const scene1Content = `กลิ่นของไฟป่า (Wildfire) ยังคงติดแน่นอยู่ในชั้นบรรยากาศ มันไม่ได้มีกลิ่นเหมือนฟืนไหม้ทั่วไป แต่เป็นกลิ่นฉุนแสบจมูกของสารเคมีโบราณที่เผาผลาญทั้งไม้ เหล็ก และเนื้อมนุษย์จนกลายเป็นเถ้าสีมรกต

ควันสีเขียวหม่นลอยอ้อยอิ่งอยู่เหนือผิวน้ำที่นิ่งสนิทราวกับกระจกสีดำ ซากเรือรบของตระกูลบาราเธียนลอยเคว้งคว้าง บางลำยังคงมีเปลวไฟสีเขียวริบหรี่เลียอยู่ตามเสากระโดงเรือที่หักสะบั้น

"พวกเราไม่ควรมาอยู่ที่นี่..." เสียงกระซิบสั่นเครือดังขึ้นจากด้านหลัง

หยดเลือดอุ่นๆ ไหลลงมาจากรอยแผลที่หน้าผาก หยดลงบนหินชื้นแฉะของชายฝั่งเบย์แห่งแบล็กวอเตอร์ การตื่นขึ้นมาในร่างที่ไม่คุ้นเคยและโลกที่เต็มไปด้วยความตายนี้ไม่ใช่ความฝัน ทุกสัมผัส ทั้งความหนาวเหน็บที่บาดลึกถึงกระดูก และเสียงกรีดร้องอันแผ่วเบาของทหารที่กำลังจะขาดใจ ล้วนเป็นของจริง

ณ ริมกำแพงโคลน ไม่ไกลจากซากเรือที่เกยตื้น ร่างของชายร่างแคระในชุดเกราะที่เปรอะเปื้อนโคลนและคราบเลือดนอนแน่นิ่งอยู่ ใบหน้าของเขาถูกฟันเป็นแนวยาวจากหน้าผากจรดแก้ม เลือดสีคล้ำยังคงไหลซึมออกมาอย่างต่อเนื่อง

"นั่น Tyrion Lannister..." 

สายตาจ้องมองไปยังร่างนั้นด้วยความตระหนักรู้ชวนขนลุก ในประวัติศาสตร์เดิม เขาควรจะรอดและถูกนำตัวไปรักษา แต่ในค่ำคืนนี้ ทหารของราชินีเซอร์ซีสองนายกำลังเดินถือหอกเลียบชายฝั่งเข้ามาใกล้ หากไม่มีใครทำอะไร ชะตากรรมของเวสเทอรอสจะเปลี่ยนไปตลอดกาลตั้งแต่นาทีนี้`;

  db.insert(scenes)
    .values({
      id: scene1Id,
      partId: part1.id,
      order: 1,
      title: "ฉากที่ 1: เถ้าถ่านสีมรกตเหนืออ่าวแบล็กวอเตอร์",
      location: "Blackwater Bay, King's Landing Shores",
      charactersPresent: JSON.stringify(["Jon Snow", "Tyrion Lannister"]),
      contentMarkdown: scene1Content,
      summary: "ตื่นขึ้นมาท่ามกลางซากปรักหักพังหลังศึก Blackwater พบ Tyrion Lannister ที่บาดเจ็บสาหัสและกำลังตกเป็นเป้าหมายของทหารที่ออกกวาดล้าง",
      wordCount: 320,
      version: 1,
      directorNote: "ให้ฉันกับเพื่อนได้สติหลังหลุดเข้ามาในโลกนี้เป็นครั้งแรก และต้องตัดสินใจช่วย Tyrion ก่อนที่ทหารจะมาถึง",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(sceneVersions)
    .values({
      id: crypto.randomUUID(),
      sceneId: scene1Id,
      versionNumber: 1,
      title: "ฉากที่ 1: เถ้าถ่านสีมรกตเหนืออ่าวแบล็กวอเตอร์",
      contentMarkdown: scene1Content,
      summary: "ตื่นขึ้นมาท่ามกลางซากปรักหักพังหลังศึก Blackwater",
      directorNote: "เปิดตัวครั้งแรกในโลก GoT",
      createdAt: now,
    })
    .run();

  // Add Movie Stills and reference images for Scene 1
  const movieStillsData = [
    {
      prompt: "Wildfire explosion consuming the naval fleet at the Battle of the Blackwater, dark green flames glowing violently against the midnight sea",
      filePath: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
      kind: "movie_still" as const,
      caption: "เพลิงไฟป่าสีมรกตผลาญกองทัพเรือ ณ ศึก Blackwater (Canon Reference)",
    },
    {
      prompt: "Ancient medieval fortress standing atop high sea cliffs surrounded by foggy ocean and dark stormy skies, Red Keep cinematic",
      filePath: "https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=1200&q=80",
      kind: "movie_still" as const,
      caption: "ป้อมปราการ Red Keep และชายฝั่งอ่าวแบล็กวอเตอร์ยามราตรี",
    },
  ];

  for (const still of movieStillsData) {
    db.insert(images)
      .values({
        id: crypto.randomUUID(),
        projectId: project.id,
        sceneId: scene1Id,
        characterId: null,
        prompt: still.prompt,
        negativePrompt: "",
        provider: "reference",
        seed: "still-1",
        filePath: still.filePath,
        kind: still.kind,
        approved: 1,
        caption: still.caption,
        metadata: JSON.stringify({ isMovieStill: true }),
        createdAt: now,
      })
      .run();
  }

  // Also add 1 AI scene illustration placeholder
  db.insert(images)
    .values({
      id: crypto.randomUUID(),
      projectId: project.id,
      sceneId: scene1Id,
      characterId: null,
      prompt: "Two young outlanders standing amidst burning green wildfire ruins on dark stony beach, medieval dark fantasy cinematic painting, muted palette",
      negativePrompt: "bright colors, modern clothing, cartoon",
      provider: "mock",
      seed: "ai-scene-1",
      filePath: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
      kind: "scene",
      approved: 1,
      caption: "การตื่นขึ้นท่ามกลางซากเรือที่ลุกไหม้",
      metadata: JSON.stringify({ isMock: true }),
      createdAt: now,
    })
    .run();

  console.log("Seeded scene 1 with images successfully!");
}

run();
