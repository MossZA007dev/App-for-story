import { db } from "./index";
import { projects, characters, parts, continuityLedgers, abilities } from "./schema";
import { DEFAULT_STORY_RULES } from "../templates/defaultStoryRules";
import crypto from "crypto";

export function seedDemoProject() {
  const existing = db.select().from(projects).all();
  if (existing.length > 0) {
    console.log("Database already has projects, skipping seed.");
    return existing[0].id;
  }

  console.log("Seeding initial demo project: Game of Thrones Dark AU...");
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(projects)
    .values({
      id: projectId,
      title: "เงาทมิฬแห่งบัลลังก์เหล็ก (Shadows of the Iron Throne)",
      universe: "Game of Thrones",
      timelineScope: "Season 2 AU (หลังศึก Blackwater)",
      theme: "ความเสื่อมทรามของอำนาจ การทรยศทางจิตวิทยา และชะตากรรมที่ต้องแลกด้วยวิญญาณ",
      worldNotes:
        "Ned Stark ไม่ได้ถูกตัดศีรษะที่ลานประหาร แต่ถูกพาตัวหลบหนีอย่างเป็นความลับโดยสมาคมนักฆ่าไร้หน้าไปยัง Dragonstone ทำให้สงครามห้ากษัตริย์ทวีความบิดเบี้ยวและมืดมนยิ่งกว่าเดิม",
      storyRules: DEFAULT_STORY_RULES,
      styleGuide:
        "dark fantasy cinematic oil painting, muted earth tones, Rembrandt lighting, photorealistic, 8k, film still",
      targetSceneWords: 1200,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const part1Id = crypto.randomUUID();
  db.insert(parts)
    .values({
      id: part1Id,
      projectId,
      number: 1,
      title: "ภาคที่ 1: เพลิงสลายที่เบย์แห่งแบล็กวอเตอร์",
      scope: "SS2 Post-Blackwater",
      theme: "ความพ่ายแพ้ การลี้ภัย และเมล็ดพันธุ์แห่งความแค้น",
      peakSummary:
        "Stannis รอดตายจากไฟป่าแต่ถูกวิญญาณในเงามืดกัดกิน Jon Snow บนกำแพงค้นพบความจริงเรื่องชาติกำเนิดเร็วกว่ากำหนด",
      status: "planned",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(continuityLedgers)
    .values({
      id: crypto.randomUUID(),
      projectId,
      partId: part1Id,
      sceneId: null,
      ledgerData: JSON.stringify({
        deaths: [],
        injuries_scars: ["Tyrion Lannister มีแผลเป็นขนาดใหญ่พาดผ่านใบหน้าจากดาบของ Mandon Moore"],
        who_knows_whom: ["Jon Snow และ Jeor Mormont", "Ned Stark รู้จัก Jaqen H'ghar"],
        possessions_secrets: [
          "Ned Stark ล่วงรู้ถึงการมีอยู่ของทายาทมังกรคนสุดท้ายที่แท้จริง",
          "Stannis ถือดาบ Lightbringer ที่เริ่มแผ่ไอเย็นแทนความร้อน",
        ],
        locations: {
          "Jon Snow": "The Wall (Castle Black)",
          "Ned Stark": "Dragonstone (Crypts)",
          "Tyrion Lannister": "King's Landing (Maester's Tower)",
        },
        canon_deviations: ["Ned Stark ยังมีชีวิตอยู่", "Stannis ถอยทัพได้รวดเร็วกว่าปกติ"],
        open_threads: [
          "ใครเป็นผู้ส่ง Jaqen H'ghar มาช่วย Ned Stark?",
          "เสียงกระซิบในเปลวเพลิงของ Melisandre คืออะไรกันแน่?",
        ],
      }),
      isCurrent: 1,
      createdAt: now,
    })
    .run();

  // 6 Characters for Acceptance Criteria test
  const demoCharacters = [
    {
      name: "Jon Snow",
      gender: "ชาย",
      startMbti: "ISFP",
      currentMbti: "ISFP",
      faction: "Night's Watch / Stark",
      chosenRole: "ผู้คุมสัญญากลืนวิญญาณ (Bound Commander)",
      roleReason: "ต้องเลือกระหว่างคำสาบานของพี่น้องอีกากับสายเลือดกษัตริย์โบราณที่กำลังตื่นขึ้น",
      status: "alive" as const,
      locationNow: "The Wall",
      visualSheet: {
        age: "18 ปี",
        build: "สมส่วน คล่องแคล่ว",
        hair_eyes: "ผมสีดำหยักศพ ดวงตาสีเทาเข้มดั่งหินผา",
        facial_traits: "สีหน้าเรียบเฉย แววตาระแวงระวัง",
        clothing: "เสื้อคลุมขนสัตว์สีดำหยาบ เกราะหนังหนา",
        scars_marks: "รอยข่วนจางๆ ที่ข้างแก้ม",
      },
      ability: {
        name: "Warg Instincts & Old Blood",
        origin: "สายเลือด First Men โบราณ",
        cost: "ยิ่งเชื่อมจิตกับ Ghost มากเท่าไหร่ ยิ่งสูญเสียความเป็นมนุษย์และอารมณ์ความรู้สึก",
      },
    },
    {
      name: "Daenerys Targaryen",
      gender: "หญิง",
      startMbti: "ENFJ",
      currentMbti: "ENFJ",
      faction: "House Targaryen",
      chosenRole: "ราชินีเพลิงผลาญ (Ashen Sovereign)",
      roleReason: "การยอมรับว่าความเมตตาไม่อาจสยบความชั่วช้า และเพลิงคือคำตอบเดียว",
      status: "alive" as const,
      locationNow: "Qarth Outskirts",
      visualSheet: {
        age: "17 ปี",
        build: "บอบบางแต่สง่างาม",
        hair_eyes: "ผมสีเงินประกายทอง ดวงตาสีม่วงอเมทิสต์ลุกโชน",
        facial_traits: "ใบหน้าได้รูป แววตาคมกริบไร้ความลังเล",
        clothing: "ผ้าไหมสีฟ้าครามปักลวดลายเกล็ดมังกร",
        scars_marks: "รอยไหม้ตื้นๆ บริเวณปลายนิ้ว",
      },
      ability: {
        name: "Fire Communion",
        origin: "สายเลือดแห่งวาลิเรียโบราณ",
        cost: "ทนความร้อนได้สูง แต่เสียงสะท้อนของมังกรจะค่อยๆ เผาผลาญความสงบสุขในสมอง",
      },
    },
    {
      name: "Tyrion Lannister",
      gender: "ชาย",
      startMbti: "ENTP",
      currentMbti: "ENTP",
      faction: "House Lannister",
      chosenRole: "สถาปนิกเงาผู้ถูกเนรเทศ (Disfigured Strategist)",
      roleReason: "สูญเสียตำแหน่งและใบหน้า เหลือเพียงสติปัญญาที่เต็มไปด้วยยาพิษและความแค้นต่อบิดา",
      status: "alive" as const,
      locationNow: "King's Landing",
      visualSheet: {
        age: "34 ปี",
        build: "คนแคระ ร่างกายเตี้ยล่ำ",
        hair_eyes: "ผมสีบลอนด์ทองยุ่งเหยิง ดวงตาสองสี (เขียวและดำ)",
        facial_traits: "รอยแผลเป็นสีม่วงคล้ำผ่ากลางจมูกและใบหน้า",
        clothing: "เสื้อกั๊กกำมะหยี่สีแดงเลือดหมูเปื้อนฝุ่น",
        scars_marks: "แผลฉกรรจ์กลางใบหน้าจากศึก Blackwater",
      },
      ability: {
        name: "Venomous Intellect",
        origin: "การเอาตัวรอดในตระกูลแลนนิสเตอร์",
        cost: "อ่านใจและกลยุทธ์ผู้อื่นทะลุปรุโปร่ง แต่ต้องแลกด้วยอาการนอนไม่หลับและการพึ่งพาเหล้าองุ่น",
      },
    },
    {
      name: "Arya Stark",
      gender: "หญิง",
      startMbti: "ISFP",
      currentMbti: "ISTP",
      faction: "Faceless Men Recruit",
      chosenRole: "เข็มพิษไร้นาม (Nameless Needle)",
      roleReason: "ลบตัวตนเดิมเพื่อแลกกับพลังการล้างแค้น ท่องรายชื่อคนที่จะต้องตายทุกค่ำคืน",
      status: "alive" as const,
      locationNow: "Riverlands",
      visualSheet: {
        age: "12 ปี",
        build: "ตัวเล็ก คล่องแคล่วว่องไว",
        hair_eyes: "ผมสีน้ำตาลตัดสั้น ดวงตาสีเทาคมกล้า",
        facial_traits: "ใบหน้ามอมแมมด้วยคราบเขม่า",
        clothing: "เสื้อคลุมมอมแมมของเด็กรับใช้",
        scars_marks: "รอยฟกช้ำตามข้อศอกและหัวเข่า",
      },
      ability: {
        name: "Shadow Step & Death Rhythm",
        origin: "วิชาดาบ Water Dancing ผสานศาสตร์สังหาร",
        cost: "ทุกชีวิตที่สังหารจะกัดกร่อนความทรงจำเกี่ยวกับครอบครัวสตาร์ก",
      },
    },
    {
      name: "Jaime Lannister",
      gender: "ชาย",
      startMbti: "ESTP",
      currentMbti: "ESTP",
      faction: "House Lannister (Captive)",
      chosenRole: "อัศวินผู้ไร้เกียรติ (Tarnished Knight)",
      roleReason: "สูญเสียความหยิ่งผยอง เริ่มค้นพบว่าการรักษาคำสัตย์ที่แท้จริงคืออะไร",
      status: "captive" as const,
      locationNow: "Riverrun (Cell)",
      visualSheet: {
        age: "36 ปี",
        build: "สูงสง่า ไหล่กว้าง",
        hair_eyes: "ผมสีทองยาวรุงรัง หนวดเคราขึ้นรกครึ้ม",
        facial_traits: "ดวงตาสีเขียวมรกตที่เริ่มมีความเศร้าหมองซ่อนอยู่",
        clothing: "เสื้อผ้าโทรมขาดวิ่นไร้เกราะสีทอง",
        scars_marks: "ข้อมือเป็นรอยแผลเป็นจากโซ่ตรวน",
      },
      ability: {
        name: "Instinctive Blademaster",
        origin: "พรสวรรค์การใช้ดาบระดับตำนาน",
        cost: "แม้จะใช้ดาบได้คล่อง แต่บาดแผลในใจทำให้มือสั่นในยามเผชิญหน้ากับความจริง",
      },
    },
    {
      name: "Melisandre",
      gender: "หญิง",
      startMbti: "INFJ",
      currentMbti: "INFJ",
      faction: "R'hllor Priests / Dragonstone",
      chosenRole: "ผู้สื่อสารถ่านเพลิง (Shadow Weaver)",
      roleReason: "พร้อมเผาทุกสิ่งรวมถึงคนที่ภักดีเพื่อสร้างกษัตริย์ในคำทำนาย",
      status: "alive" as const,
      locationNow: "Dragonstone",
      visualSheet: {
        age: "ไม่ปรากฏแน่ชัด (ดูราว 30 ปี)",
        build: "สูงเพรียว เย้ายวนและน่าเกรงขาม",
        hair_eyes: "ผมสีแดงเพลิงดั่งทองแดง ดวงตาสีแดงฉาน",
        facial_traits: "ผิวขาวซีดราวน้ำนม ริมฝีปากสีชาด",
        clothing: "ชุดกระโปรงผ้าไหมยาวสีแดงเข้ม รัดคอด้วยทับทิมส่องแสง",
        scars_marks: "รอยสักอักขระโบราณที่แผ่นหลัง",
      },
      ability: {
        name: "Shadow Binding & Flame Divination",
        origin: "เวทมนตร์แห่งอัสชาย (Asshai-by-the-Shadow)",
        cost: "การให้กำเนิดเงาสังหารดูดกลืนพลังชีวิตและความอบอุ่นของร่างกายตนเองและเป้าหมาย",
      },
    },
  ];

  for (const char of demoCharacters) {
    const charId = crypto.randomUUID();
    db.insert(characters)
      .values({
        id: charId,
        projectId,
        name: char.name,
        gender: char.gender,
        startMbti: char.startMbti,
        currentMbti: char.currentMbti,
        chosenRole: char.chosenRole,
        roleReason: char.roleReason,
        faction: char.faction,
        status: char.status,
        locationNow: char.locationNow,
        visualSheet: JSON.stringify(char.visualSheet),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (char.ability) {
      db.insert(abilities)
        .values({
          id: crypto.randomUUID(),
          characterId: charId,
          name: char.ability.name,
          origin: char.ability.origin,
          cost: char.ability.cost,
          gainedAtPart: 1,
        })
        .run();
    }
  }

  console.log("Seed completed successfully!");
  return projectId;
}
