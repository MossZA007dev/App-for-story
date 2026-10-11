import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, projects } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeCanon = searchParams.get("includeCanon") === "true";
    const typeFilter = searchParams.get("type"); // "self" | "friend" | "all"

    let query = db
      .select({
        id: characters.id,
        projectId: characters.projectId,
        name: characters.name,
        realNickname: characters.realNickname,
        characterType: characters.characterType,
        gender: characters.gender,
        startMbti: characters.startMbti,
        currentMbti: characters.currentMbti,
        chosenRole: characters.chosenRole,
        roleReason: characters.roleReason,
        faction: characters.faction,
        background: characters.background,
        avatarUrl: characters.avatarUrl,
        createdAt: characters.createdAt,
        updatedAt: characters.updatedAt,
        projectTitle: projects.title,
        projectUniverse: projects.universe,
      })
      .from(characters)
      .leftJoin(projects, eq(characters.projectId, projects.id))
      .orderBy(desc(characters.createdAt));

    const allChars = query.all();

    // Filter by character type
    let filtered = allChars;
    if (!includeCanon) {
      filtered = filtered.filter((c) => c.characterType === "self" || c.characterType === "friend");
    }

    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter((c) => c.characterType === typeFilter);
    }

    return NextResponse.json({
      success: true,
      characters: filtered,
    });
  } catch (error: unknown) {
    console.error("Failed to load characters from hub:", error);
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดตัวละคร";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
