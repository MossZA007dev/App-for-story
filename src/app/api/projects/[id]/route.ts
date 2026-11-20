import {withAccount} from "@/lib/auth/account";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, characters, parts, episodes, scenes, continuityLedgers, abilities, relationships, images, } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";
const UpdateProjectSchema = z.object({
    title: z.string().min(1).optional(),
    universe: z.string().min(1).optional(),
    timelineScope: z.string().optional(),
    theme: z.string().optional(),
    worldNotes: z.string().optional(),
    storyRules: z.string().optional(),
    styleGuide: z.string().optional(),
    targetSceneWords: z.number().optional(),
    coverImage: z.string().optional(),
});
export async function GET(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { id } = await params;
        const project = (await db.select().from(projects).where(eq(projects.id, id)).limit(1))[0];
        if (!project) {
            return NextResponse.json({ error: "ไม่พบโปรเจกต์ที่ระบุ" }, { status: 404 });
        }
        // Characters with abilities
        const projectCharacters = await db
            .select()
            .from(characters)
            .where(eq(characters.projectId, id));
        const charactersWithAbilities = (await Promise.all(projectCharacters.map(async (char) => {
            const charAbilities = await db
                .select()
                .from(abilities)
                .where(eq(abilities.characterId, char.id));
            return {
                ...char,
                abilities: charAbilities,
                visualSheetParsed: char.visualSheet ? JSON.parse(char.visualSheet) : {},
                roleOptionsParsed: char.roleOptions ? JSON.parse(char.roleOptions) : [],
            };
        })));
        // Parts with episodes and scenes
        const projectParts = await db
            .select()
            .from(parts)
            .where(eq(parts.projectId, id))
            .orderBy(asc(parts.number));
        const projectEpisodes = await db
            .select()
            .from(episodes)
            .where(eq(episodes.projectId, id))
            .orderBy(asc(episodes.number));
        const partsWithScenes = (await Promise.all(projectParts.map(async (part) => {
            const partScenes = await db
                .select()
                .from(scenes)
                .where(eq(scenes.partId, part.id))
                .orderBy(asc(scenes.order));
            const partEpisodes = projectEpisodes
                .filter((ep) => ep.partId === part.id)
                .map((ep) => ({
                ...ep,
                scenes: partScenes.filter((s) => s.episodeId === ep.id),
            }));
            const episodeOrderMap = new Map(projectEpisodes.map((ep) => [ep.id, ep.number]));
            const sortedPartScenes = [...partScenes].sort((a, b) => {
                const epNumA = a.episodeId ? episodeOrderMap.get(a.episodeId) ?? 999 : 0;
                const epNumB = b.episodeId ? episodeOrderMap.get(b.episodeId) ?? 999 : 0;
                if (epNumA !== epNumB)
                    return epNumA - epNumB;
                return a.order - b.order;
            });
            return {
                ...part,
                episodes: partEpisodes,
                scenes: sortedPartScenes,
            };
        })));
        // Relationships
        const projectRelationships = await db
            .select()
            .from(relationships)
            .where(eq(relationships.projectId, id));
        // Latest Continuity Ledger
        const latestLedger = (await db
            .select()
            .from(continuityLedgers)
            .where(eq(continuityLedgers.projectId, id))
            .orderBy(desc(continuityLedgers.createdAt))
            .limit(1))[0];
        // Approved & Recent Images
        const projectImages = await db
            .select()
            .from(images)
            .where(eq(images.projectId, id))
            .orderBy(desc(images.createdAt));
        return NextResponse.json({
            project,
            characters: charactersWithAbilities,
            parts: partsWithScenes,
            relationships: projectRelationships,
            continuityLedger: latestLedger
                ? {
                    ...latestLedger,
                    ledgerData: JSON.parse(latestLedger.ledgerData),
                }
                : null,
            images: projectImages,
        });
    }
    catch (error: unknown) {
        console.error("Failed to get project details:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลโปรเจกต์";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
export async function PUT(req: NextRequest, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
return withAccount(req, async () => {
    try {
        const { id } = await params;
        const body = await req.json();
        const validated = UpdateProjectSchema.parse(body);
        const now = new Date().toISOString();
        await db.update(projects)
            .set({
            ...validated,
            updatedAt: now,
        })
            .where(eq(projects.id, id));
        const updated = (await db.select().from(projects).where(eq(projects.id, id)).limit(1))[0];
        return NextResponse.json({
            success: true,
            project: updated,
        });
    }
    catch (error: unknown) {
        console.error("Failed to update project:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตโปรเจกต์";
        return NextResponse.json({ error: msg }, { status: 400 });
    }

});
}
export async function DELETE(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { id } = await params;
        await db.delete(projects).where(eq(projects.id, id));
        return NextResponse.json({
            success: true,
            message: "ลบโปรเจกต์สำเร็จ",
        });
    }
    catch (error: unknown) {
        console.error("Failed to delete project:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบโปรเจกต์";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
