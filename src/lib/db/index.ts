import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { seedDemoProject } from "./seed";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Ensure data folder and images folder exist
const isVercel = Boolean(process.env.VERCEL);
const baseDir = isVercel ? path.join("/tmp", "saga_data") : path.join(process.cwd(), "data");
export const dataDir = baseDir;
export const imagesDir = path.join(dataDir, "images");
export const audioDir = path.join(dataDir, "audio");

try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create directories:", err);
}

const dbPath = path.join(dataDir, "saga_forge.db");

// If running on Vercel, copy pre-existing database and images from repository to /tmp on first boot
if (isVercel) {
  if (!fs.existsSync(dbPath)) {
    const sourceDb = path.join(process.cwd(), "data", "saga_forge.db");
    if (fs.existsSync(sourceDb)) {
      try {
        fs.copyFileSync(sourceDb, dbPath);
      } catch (e) {
        console.warn("Could not copy initial db on Vercel:", e);
      }
    }
  }

  const sourceImages = path.join(process.cwd(), "data", "images");
  if (fs.existsSync(sourceImages)) {
    try {
      const files = fs.readdirSync(sourceImages);
      for (const file of files) {
        const dest = path.join(imagesDir, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(sourceImages, file), dest);
        }
      }
    } catch (e) {
      console.warn("Could not copy initial images on Vercel:", e);
    }
  }
}

// Singleton connection for Next.js hot reload
declare global {
  // eslint-disable-next-line no-var
  var __sqlite_db: Database.Database | undefined;
}

const sqlite = global.__sqlite_db ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") {
  global.__sqlite_db = sqlite;
}

// Enable WAL mode for better concurrency in SQLite (standard delete journal on Vercel)
if (!isVercel) {
  sqlite.pragma("journal_mode = WAL");
}
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto initialize tables if not exist
export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      universe TEXT NOT NULL,
      timeline_scope TEXT DEFAULT '',
      theme TEXT DEFAULT '',
      world_notes TEXT DEFAULT '',
      story_rules TEXT NOT NULL,
      style_guide TEXT DEFAULT 'dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed',
      target_scene_words INTEGER DEFAULT 1200,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT DEFAULT '',
      start_mbti TEXT DEFAULT '',
      current_mbti TEXT DEFAULT '',
      role_options TEXT DEFAULT '[]',
      chosen_role TEXT DEFAULT '',
      role_reason TEXT DEFAULT '',
      faction TEXT DEFAULT '',
      background TEXT DEFAULT '',
      status TEXT DEFAULT 'alive',
      location_now TEXT DEFAULT '',
      visual_sheet TEXT DEFAULT '{}',
      portrait_image_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS abilities (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      name TEXT NOT NULL,
      origin TEXT DEFAULT '',
      link_to_personality TEXT DEFAULT '',
      cost TEXT DEFAULT '',
      gained_at_part INTEGER DEFAULT 1,
      lost_at_part INTEGER,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      char_a TEXT NOT NULL,
      char_b TEXT NOT NULL,
      type TEXT NOT NULL,
      trust_level INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      changed_at_scene TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(char_a) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY(char_b) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      scope TEXT DEFAULT '',
      theme TEXT DEFAULT '',
      peak_summary TEXT DEFAULT '',
      status TEXT DEFAULT 'planned',
      character_change_summary TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      part_id TEXT NOT NULL,
      episode_id TEXT,
      \`order\` INTEGER NOT NULL,
      title TEXT NOT NULL,
      location TEXT DEFAULT '',
      characters_present TEXT DEFAULT '[]',
      content_markdown TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      director_note TEXT DEFAULT '',
      bgm_url TEXT DEFAULT '',
      bgm_title TEXT DEFAULT '',
      dialogue_bindings TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scene_versions (
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content_markdown TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      director_note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS change_logs (
      id TEXT PRIMARY KEY,
      part_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      mbti_before TEXT NOT NULL,
      mbti_after TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      beliefs TEXT DEFAULT '',
      losses TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE CASCADE,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS continuity_ledgers (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scene_id TEXT,
      part_id TEXT,
      ledger_data TEXT NOT NULL,
      is_current INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scene_id TEXT,
      character_id TEXT,
      prompt TEXT NOT NULL,
      negative_prompt TEXT DEFAULT '',
      provider TEXT NOT NULL,
      seed TEXT,
      file_path TEXT NOT NULL,
      kind TEXT NOT NULL,
      approved INTEGER DEFAULT 0,
      caption TEXT DEFAULT '',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      anthropic_api_key TEXT DEFAULT '',
      anthropic_model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
      image_provider TEXT DEFAULT 'openai',
      image_api_key TEXT DEFAULT '',
      default_scene_words INTEGER DEFAULT 1200,
      temperature REAL DEFAULT 0.7,
      global_visual_style TEXT DEFAULT 'dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collaborators (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      character_id TEXT,
      role TEXT DEFAULT 'co_author',
      can_edit_scenes INTEGER DEFAULT 1,
      can_upload_media INTEGER DEFAULT 1,
      can_generate_ai INTEGER DEFAULT 1,
      last_active_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sound_effects (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      audio_url TEXT NOT NULL,
      source_type TEXT DEFAULT 'upload',
      duration_seconds REAL DEFAULT 0,
      volume REAL DEFAULT 0.8,
      tags TEXT DEFAULT '[]',
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for newly added columns
  try {
    sqlite.exec("ALTER TABLE characters ADD COLUMN character_type TEXT DEFAULT 'friend'");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE characters ADD COLUMN real_nickname TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE images ADD COLUMN caption TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE characters ADD COLUMN avatar_url TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE scenes ADD COLUMN bgm_url TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE scenes ADD COLUMN bgm_title TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE scenes ADD COLUMN dialogue_bindings TEXT DEFAULT '{}'");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE projects ADD COLUMN cover_image TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE scenes ADD COLUMN last_edited_by TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE projects ADD COLUMN share_code TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE projects ADD COLUMN sfx_initialized INTEGER DEFAULT 0");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE app_settings ADD COLUMN gemini_api_key TEXT DEFAULT ''");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE app_settings ADD COLUMN gemini_model TEXT DEFAULT 'gemini-2.5-flash'");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE app_settings ADD COLUMN text_ai_provider TEXT DEFAULT 'claude'");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE scenes ADD COLUMN episode_id TEXT");
  } catch {}

  // Auto-migrate: ensure every existing part has at least 1 episode, and link orphaned scenes to it
  try {
    const existingParts = sqlite.prepare("SELECT id, project_id, number, title FROM parts").all() as any[];
    for (const p of existingParts) {
      let ep = sqlite.prepare("SELECT id FROM episodes WHERE part_id = ? ORDER BY number ASC LIMIT 1").get(p.id) as { id: string } | undefined;
      if (!ep) {
        const epId = crypto.randomUUID();
        const now = new Date().toISOString();
        sqlite.prepare("INSERT INTO episodes (id, project_id, part_id, number, title, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
          epId,
          p.project_id,
          p.id,
          1,
          "ตอนที่ 1",
          "",
          now,
          now
        );
        ep = { id: epId };
      }
      // Link any scenes in this part that do not have an episode_id yet
      sqlite.prepare("UPDATE scenes SET episode_id = ? WHERE part_id = ? AND (episode_id IS NULL OR episode_id = '')").run(
        ep.id,
        p.id
      );
    }
  } catch (err) {
    console.warn("Episode migration error:", err);
  }

  // Auto-seed if database has 0 projects
  try {
    const row = sqlite.prepare("SELECT count(*) as cnt FROM projects").get() as { cnt: number };
    if (!row || row.cnt === 0) {
      seedDemoProject();
    }
  } catch (err) {
    console.warn("Auto-seed error:", err);
  }
}

// Auto-run initDatabase upon import
initDatabase();

