import { db } from "@/lib/db";
import { projects, characters, parts, scenes, images } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export interface SagaProjectItem {
  id: string;
  title: string;
  universe: string;
  timelineScope?: string | null;
  theme?: string | null;
  worldNotes?: string | null;
  coverImage?: string;
  characterCount: number;
  partCount: number;
  completedParts: number;
  sceneCount: number;
  totalWordCount: number;
  createdAt: string;
  updatedAt: string;
}

export function getAllProjectsEnriched(): SagaProjectItem[] {
  try {
    const allProjects = db.select().from(projects).orderBy(desc(projects.createdAt)).all();

    if (allProjects.length === 0) {
      return [];
    }

    const allChars = db.select({ id: characters.id, projectId: characters.projectId }).from(characters).all();
    const allParts = db.select().from(parts).all();
    const allScenes = db.select({ id: scenes.id, partId: scenes.partId, wordCount: scenes.wordCount }).from(scenes).all();
    const allImages = db
      .select({ id: images.id, projectId: images.projectId, filePath: images.filePath })
      .from(images)
      .orderBy(desc(images.approved), desc(images.createdAt))
      .all();

    // 1. Group characters count by projectId
    const charsCountByProject = new Map<string, number>();
    for (const c of allChars) {
      if (c.projectId) {
        charsCountByProject.set(c.projectId, (charsCountByProject.get(c.projectId) || 0) + 1);
      }
    }

    // 2. Group scenes and word count by partId
    const scenesStatsByPart = new Map<string, { count: number; words: number }>();
    for (const s of allScenes) {
      if (s.partId) {
        const cur = scenesStatsByPart.get(s.partId) || { count: 0, words: 0 };
        cur.count += 1;
        cur.words += (s.wordCount || 0);
        scenesStatsByPart.set(s.partId, cur);
      }
    }

    // 3. Group parts, completed parts, scenes count, and word count by projectId
    const partsByProject = new Map<string, { count: number; completed: number; sceneCount: number; totalWords: number }>();
    for (const p of allParts) {
      if (p.projectId) {
        const cur = partsByProject.get(p.projectId) || { count: 0, completed: 0, sceneCount: 0, totalWords: 0 };
        cur.count += 1;
        if (p.status === "done") cur.completed += 1;

        const sStats = scenesStatsByPart.get(p.id);
        if (sStats) {
          cur.sceneCount += sStats.count;
          cur.totalWords += sStats.words;
        }

        partsByProject.set(p.projectId, cur);
      }
    }

    // 4. Map first approved/latest cover image by projectId
    const coverByProject = new Map<string, string>();
    for (const img of allImages) {
      if (img.projectId && !coverByProject.has(img.projectId)) {
        coverByProject.set(img.projectId, img.filePath);
      }
    }

    // 5. Enrich all projects instantly in memory
    return allProjects.map((proj) => {
      const pStats = partsByProject.get(proj.id) || { count: 0, completed: 0, sceneCount: 0, totalWords: 0 };
      const charCount = charsCountByProject.get(proj.id) || 0;
      const coverImg = coverByProject.get(proj.id);

      return {
        ...proj,
        characterCount: charCount,
        partCount: pStats.count,
        completedParts: pStats.completed,
        sceneCount: pStats.sceneCount,
        totalWordCount: pStats.totalWords,
        coverImage: proj.coverImage || coverImg || "/images/saga-got-cover.jpg",
      };
    });
  } catch (error) {
    console.error("Error in getAllProjectsEnriched:", error);
    return [];
  }
}
