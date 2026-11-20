import { db } from "@/lib/db";
import { projects, parts, episodes, scenes, characters } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { parseSceneToDialogueBlocks } from "./dialogueParser";
import { ReaderStatusSchema, ReaderStatus } from "./readerStatus";
import crypto from "node:crypto";
export class ReaderStatusError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function readerStatusContext(
  projectId: string,
  sceneId: string,
  index: number,
) {
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (!project) throw new ReaderStatusError("ไม่พบเรื่องนี้", 404);
  const orderedParts = db
    .select()
    .from(parts)
    .where(eq(parts.projectId, projectId))
    .orderBy(asc(parts.number))
    .all();
  const cast = db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .all();
  const meta = cast.map((c) => ({
    id: c.id,
    name: c.name,
    realNickname: c.realNickname || undefined,
    characterType: c.characterType || undefined,
  }));
  const ordered = orderedParts.flatMap((part) => {
    const eps = db
      .select()
      .from(episodes)
      .where(eq(episodes.partId, part.id))
      .orderBy(asc(episodes.number))
      .all();
    const list = db
      .select()
      .from(scenes)
      .where(eq(scenes.partId, part.id))
      .orderBy(asc(scenes.order))
      .all();
    return [
      ...eps.flatMap((ep) => list.filter((s) => s.episodeId === ep.id)),
      ...list.filter((s) => !eps.some((e) => e.id === s.episodeId)),
    ];
  });
  const stop = ordered.findIndex((s) => s.id === sceneId);
  if (stop < 0) throw new ReaderStatusError("ไม่พบฉากในเรื่องนี้", 404);
  const currentBlocks = parseSceneToDialogueBlocks(
    ordered[stop].contentMarkdown || "",
    meta,
  );
  if (!Number.isInteger(index) || index < 0 || index >= currentBlocks.length)
    throw new ReaderStatusError("จุดที่อ่านยังไม่มีบทให้สรุป");
  const all = ordered.slice(0, stop + 1).flatMap((scene, si) => {
    const blocks =
      si === stop
        ? currentBlocks.slice(0, index + 1)
        : parseSceneToDialogueBlocks(scene.contentMarkdown || "", meta);
    return blocks.map((b, i) => ({
      sceneId: scene.id,
      sceneTitle: scene.title,
      block: i + 1,
      speaker: b.speakerName || "",
      text: b.text,
    }));
  });
  // Never include profiles, world notes, abilities or relationship tables: they may describe future events.
  const visibleText = all
    .map((b) => `${b.speaker} ${b.text}`)
    .join("\n")
    .toLowerCase();
  const roster = cast
    .filter((c) =>
      [c.name, c.realNickname].some(
        (n) => n && visibleText.includes(n.toLowerCase()),
      ),
    )
    .map((c) => ({
      name: c.name,
      nickname: c.realNickname || "",
      avatarUrl: c.avatarUrl,
    }));
  let length = 0,
    start = all.length;
  while (start > 0) {
    const n = JSON.stringify(all[start - 1]).length;
    if (length + n > 110000) break;
    length += n;
    start--;
  }
  if (start === all.length)
    throw new ReaderStatusError("บทนี้ยาวเกินกว่าจะวิเคราะห์ในครั้งเดียว");
  const included = all.slice(start),
    partial = start > 0;
  const context = {
    universe: project.universe,
    characters: roster.map((c) => ({ name: c.name, nickname: c.nickname })),
    passages: included,
  };
  const hash = crypto
    .createHash("sha256")
    .update("reader-status-v1" + projectId + JSON.stringify(context))
    .digest("hex");
  return {
    hash,
    context,
    roster: roster.map(({ name, avatarUrl }) => ({ name, avatarUrl })),
    checkpoint: { sceneId, sceneTitle: ordered[stop].title, block: index + 1 },
    coverage: {
      scenes: new Set(included.map((b) => b.sceneId)).size,
      blocks: included.length,
      partial,
    },
  };
}
export function validateReaderStatus(
  raw: unknown,
  source: ReturnType<typeof readerStatusContext>,
): ReaderStatus {
  const parsed = ReaderStatusSchema.parse(raw),
    names = new Set(source.roster.map((c) => c.name));
  const validateEvidence = (
    items: { sceneId: string; block: number; quote: string }[],
  ) => {
    for (const item of items) {
      const passage = source.context.passages.find(
        (p) => p.sceneId === item.sceneId && p.block === item.block,
      );
      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
      if (!passage || !normalize(passage.text).includes(normalize(item.quote)))
        throw new ReaderStatusError(
          "AI อ้างอิงข้อความที่ไม่อยู่ในช่วงที่อ่าน จึงยังไม่แสดงผล กรุณาลองใหม่",
        );
    }
  };
  if (
    parsed.comparison.verdict === "insufficient" &&
    parsed.comparison.leaders.length
  )
    throw new ReaderStatusError("ผลเปรียบเทียบยังไม่ชัดเจน จึงยังไม่แสดงอันดับ");
  if (
    parsed.comparison.verdict === "tentative" &&
    (!parsed.comparison.leaders.length || !parsed.comparison.evidence.length)
  )
    throw new ReaderStatusError("AI ยังไม่มีหลักฐานเพียงพอสำหรับเปรียบเทียบ");
  for (const name of parsed.comparison.leaders)
    if (!names.has(name))
      throw new ReaderStatusError("AI ระบุตัวละครที่ยังไม่ปรากฏในช่วงที่อ่าน");
  validateEvidence(parsed.comparison.evidence);
  const seen = new Set<string>();
  for (const c of parsed.characters) {
    if (!names.has(c.name) || seen.has(c.name))
      throw new ReaderStatusError("รายชื่อตัวละครในผลสรุปไม่ตรงกับเรื่อง");
    seen.add(c.name);
    validateEvidence(c.evidence);
    for (const a of c.abilities) validateEvidence(a.evidence);
    for (const r of c.relationships) {
      if (!names.has(r.with) || r.with === c.name)
        throw new ReaderStatusError("ความสัมพันธ์ที่วิเคราะห์ไม่มีข้อมูลตัวละครรองรับ");
      validateEvidence(r.evidence);
    }
  }
  return parsed;
}
