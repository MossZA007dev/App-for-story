import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collaborators, projects, characters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import os from "os";

// Helper to get local IPv4 network addresses
function getLocalNetworkAddresses(): string[] {
  const addresses: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
  } catch (err) {
    console.error("Error retrieving network interfaces:", err);
  }
  return addresses;
}

// GET /api/projects/[id]/collaborators
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    // 1. Fetch project info
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json({ error: "ไม่พบโปรเจกต์นี้" }, { status: 404 });
    }

    // 2. Fetch existing collaborators
    const collabList = await db.query.collaborators.findMany({
      where: eq(collaborators.projectId, projectId),
    });

    // 3. Fetch squad characters associated with this project for quick invite
    const squadCharacters = await db.query.characters.findMany({
      where: eq(characters.projectId, projectId),
    });

    // 4. Get local network IPs for WiFi sharing
    const networkIps = getLocalNetworkAddresses();

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        universe: project.universe,
        shareCode: project.shareCode || project.id,
      },
      collaborators: collabList,
      squadCharacters: squadCharacters.map((c) => ({
        id: c.id,
        name: c.name,
        realNickname: c.realNickname || c.name,
        avatarUrl: c.avatarUrl || "",
        characterType: c.characterType,
        chosenRole: c.chosenRole || "",
      })),
      networkIps,
    });
  } catch (error: any) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch collaborators" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/collaborators
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    const body = await request.json();
    const {
      name,
      nickname,
      avatarUrl,
      characterId,
      role = "co_author",
      canEditScenes = 1,
      canUploadMedia = 1,
      canGenerateAi = 1,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อหรือนามแฝงของผู้ร่วมแต่ง" },
        { status: 400 }
      );
    }

    const newId = `collab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newCollaborator = {
      id: newId,
      projectId,
      name: name.trim(),
      nickname: (nickname || name).trim(),
      avatarUrl: avatarUrl || "",
      characterId: characterId || null,
      role: role as "owner" | "co_author" | "editor" | "viewer",
      canEditScenes: canEditScenes ? 1 : 0,
      canUploadMedia: canUploadMedia ? 1 : 0,
      canGenerateAi: canGenerateAi ? 1 : 0,
      lastActiveAt: now,
      createdAt: now,
    };

    await db.insert(collaborators).values(newCollaborator);

    return NextResponse.json({
      collaborator: newCollaborator,
      message: "เพิ่มเพื่อนร่วมแต่งเรียบร้อยแล้ว",
    });
  } catch (error: any) {
    console.error("Error creating collaborator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create collaborator" },
      { status: 500 }
    );
  }
}
