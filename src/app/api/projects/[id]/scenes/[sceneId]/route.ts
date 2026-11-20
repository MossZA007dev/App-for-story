import {getCurrentAuthor} from '@/lib/account/identity';
import {lockSceneForWrite,SceneWriteError} from '@/lib/story/sceneWriteGuard';
import {withAccount} from "@/lib/auth/account";
import { deleteStoryScene, StoryDeletionError } from "@/lib/story/deleteStoryContent";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenes, sceneVersions, images, parts } from "@/lib/db/schema";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
const UpdateSceneSchema = z.object({
    expectedVersion:z.number().int().positive().optional(),
    title: z.string().optional(),
    location: z.string().optional(),
    charactersPresent: z.array(z.string()).optional(),
    contentMarkdown: z.string().optional(),
    summary: z.string().optional(),
    directorNote: z.string().optional(),
    bgmUrl: z.string().optional(),
    bgmTitle: z.string().optional(),
    dialogueBindings: z.string().optional(),
    lastEditedBy: z.string().optional(),
});
export async function GET(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sceneId: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { id, sceneId } = await params;
        const scene = (await db.select({scene:scenes}).from(scenes).innerJoin(parts,eq(parts.id,scenes.partId)).where(and(eq(scenes.id,sceneId),eq(parts.projectId,id))).limit(1))[0]?.scene;
        if (!scene) {
            return NextResponse.json({ error: "ไม่พบข้อมูลฉากนี้" }, { status: 404 });
        }
        const versions = await db
            .select()
            .from(sceneVersions)
            .where(eq(sceneVersions.sceneId, sceneId))
            .orderBy(desc(sceneVersions.versionNumber));
        const sceneImages = await db
            .select()
            .from(images)
            .where(eq(images.sceneId, sceneId))
            .orderBy(desc(images.createdAt));
        return NextResponse.json({
            scene: {
                ...scene,
                charactersPresentParsed: scene.charactersPresent ? JSON.parse(scene.charactersPresent) : [],
            },
            versions,
            images: sceneImages,
        });
    }
    catch (error: unknown) {
        console.error("Failed to load scene details:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดฉาก";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

});
}
export async function PUT(req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sceneId: string;
    }>;
}) {
return withAccount(req, async () => {
    try {
        const { id, sceneId } = await params;
        const body = await req.json();
        const validated = UpdateSceneSchema.parse(body);
        const currentScene=await lockSceneForWrite(id,sceneId,validated.expectedVersion,validated.contentMarkdown!==undefined);
        const now = new Date().toISOString();
        let newVersion = (currentScene.version||1)+1;
        // If content changes, archive existing version into scene_versions
        if (validated.contentMarkdown !== undefined &&
            validated.contentMarkdown !== currentScene.contentMarkdown) {
            // Preserve the baseline too: the first edit must not discard the imported original.
            const previousVersion = (await db.select().from(sceneVersions).where(and(eq(sceneVersions.sceneId, sceneId), eq(sceneVersions.versionNumber, currentScene.version || 1))).limit(1))[0];
            if (!previousVersion)
                await db.insert(sceneVersions).values({ id: crypto.randomUUID(), sceneId, versionNumber: currentScene.version || 1, title: currentScene.title, contentMarkdown: currentScene.contentMarkdown || "", summary: currentScene.summary, directorNote: currentScene.directorNote, createdAt: currentScene.updatedAt });
            newVersion = (currentScene.version || 1) + 1;
            await db.insert(sceneVersions)
                .values({
                id: crypto.randomUUID(),
                sceneId,
                versionNumber: newVersion,
                title: validated.title || currentScene.title,
                contentMarkdown: validated.contentMarkdown,
                summary: validated.summary || currentScene.summary,
                directorNote: validated.directorNote ?? currentScene.directorNote,
                createdAt: now,
            });
        }
        const wordCount = validated.contentMarkdown !== undefined
            ? validated.contentMarkdown.split(/\s+/).filter(Boolean).length
            : currentScene.wordCount;
        await db.update(scenes)
            .set({
            title: validated.title ?? currentScene.title,
            location: validated.location ?? currentScene.location,
            charactersPresent: validated.charactersPresent
                ? JSON.stringify(validated.charactersPresent)
                : currentScene.charactersPresent,
            contentMarkdown: validated.contentMarkdown ?? currentScene.contentMarkdown,
            summary: validated.summary ?? currentScene.summary,
            directorNote: validated.directorNote ?? currentScene.directorNote,
            bgmUrl: validated.bgmUrl ?? currentScene.bgmUrl,
            bgmTitle: validated.bgmTitle ?? currentScene.bgmTitle,
            dialogueBindings: validated.dialogueBindings ?? currentScene.dialogueBindings,
            lastEditedBy: (await getCurrentAuthor()).name,
            wordCount,
            version: newVersion,
            updatedAt: now,
        })
            .where(eq(scenes.id, sceneId));
        const updated = (await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1))[0];
        return NextResponse.json({
            success: true,
            scene: updated,
        });
    }
    catch (error: unknown) {
        if(error instanceof SceneWriteError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});
        console.error("Failed to update scene:", error);
        const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตฉาก";
        return NextResponse.json({ error: msg }, { status: 400 });
    }

});
}
export async function DELETE(_req: NextRequest, { params }: {
    params: Promise<{
        id: string;
        sceneId: string;
    }>;
}) {
return withAccount(_req, async () => {
    try {
        const { id, sceneId } = await params;
        return NextResponse.json(await deleteStoryScene(id, sceneId));
    }
    catch (e) {
        return NextResponse.json({ error: e instanceof StoryDeletionError ? e.message : "ลบไม่สำเร็จ กรุณาลองใหม่" }, { status: e instanceof StoryDeletionError ? e.status : 500 });
    }

});
}
