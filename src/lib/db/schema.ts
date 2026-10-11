import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  universe: text("universe").notNull(), // e.g. Game of Thrones, Cyberpunk AU
  timelineScope: text("timeline_scope").default(""), // e.g. SS2 AU
  theme: text("theme").default(""),
  worldNotes: text("world_notes").default(""),
  storyRules: text("story_rules").notNull(), // Master story rules prompt template
  styleGuide: text("style_guide").default("dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed"),
  targetSceneWords: integer("target_scene_words").default(1200),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gender: text("gender").default(""),
  startMbti: text("start_mbti").default(""),
  currentMbti: text("current_mbti").default(""),
  roleOptions: text("role_options").default("[]"), // JSON string of 3 role suggestions
  chosenRole: text("chosen_role").default(""),
  roleReason: text("role_reason").default(""),
  faction: text("faction").default(""),
  background: text("background").default(""),
  status: text("status", { enum: ["alive", "dead", "missing", "captive"] }).default("alive"),
  locationNow: text("location_now").default(""),
  // visual_sheet: { age, build, hair_eyes, face, default_clothing, scars_marks }
  visualSheet: text("visual_sheet").default("{}"),
  portraitImageId: text("portrait_image_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const abilities = sqliteTable("abilities", {
  id: text("id").primaryKey(),
  characterId: text("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  origin: text("origin").default(""),
  linkToPersonality: text("link_to_personality").default(""),
  cost: text("cost").default(""),
  gainedAtPart: integer("gained_at_part").default(1),
  lostAtPart: integer("lost_at_part"),
});

export const relationships = sqliteTable("relationships", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  charA: text("char_a").notNull().references(() => characters.id, { onDelete: "cascade" }),
  charB: text("char_b").notNull().references(() => characters.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // allies, rivals, estranged, etc.
  trustLevel: integer("trust_level").default(0), // -5 to 5
  note: text("note").default(""),
  changedAtScene: text("changed_at_scene"),
  updatedAt: text("updated_at").notNull(),
});

export const parts = sqliteTable("parts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  number: integer("number").notNull(), // 0 to 9
  title: text("title").notNull(),
  scope: text("scope").default(""), // e.g. Season 2
  theme: text("theme").default(""),
  peakSummary: text("peak_summary").default(""),
  status: text("status", { enum: ["planned", "drafting", "done"] }).default("planned"),
  characterChangeSummary: text("character_change_summary").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  partId: text("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  location: text("location").default(""),
  charactersPresent: text("characters_present").default("[]"), // JSON string array of names or IDs
  contentMarkdown: text("content_markdown").default(""),
  summary: text("summary").default(""), // AI 3-5 line summary
  wordCount: integer("word_count").default(0),
  version: integer("version").default(1),
  directorNote: text("director_note").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sceneVersions = sqliteTable("scene_versions", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id").notNull().references(() => scenes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  contentMarkdown: text("content_markdown").default(""),
  summary: text("summary").default(""),
  directorNote: text("director_note").default(""),
  createdAt: text("created_at").notNull(),
});

export const changeLogs = sqliteTable("change_logs", {
  id: text("id").primaryKey(),
  partId: text("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  characterId: text("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  mbtiBefore: text("mbti_before").notNull(),
  mbtiAfter: text("mbti_after").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  beliefs: text("beliefs").default(""),
  losses: text("losses").default(""),
  createdAt: text("created_at").notNull(),
});

export const continuityLedgers = sqliteTable("continuity_ledgers", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sceneId: text("scene_id"),
  partId: text("part_id"),
  // ledgerData JSON format:
  // { deaths: [], injuries_scars: [], who_knows_whom: [], possessions_secrets: [], locations: {}, canon_deviations: [], open_threads: [] }
  ledgerData: text("ledger_data").notNull(),
  isCurrent: integer("is_current").default(1),
  createdAt: text("created_at").notNull(),
});

export const images = sqliteTable("images", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sceneId: text("scene_id"),
  characterId: text("character_id"),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt").default(""),
  provider: text("provider").notNull(), // openai, replicate, stability
  seed: text("seed"),
  filePath: text("file_path").notNull(),
  kind: text("kind", { enum: ["portrait", "scene", "cover"] }).notNull(),
  approved: integer("approved").default(0), // 0: rejected/pending, 1: approved
  metadata: text("metadata").default("{}"),
  createdAt: text("created_at").notNull(),
});

export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey(), // "global"
  anthropicApiKey: text("anthropic_api_key").default(""),
  anthropicModel: text("anthropic_model").default("claude-3-5-sonnet-20241022"),
  imageProvider: text("image_provider").default("openai"),
  imageApiKey: text("image_api_key").default(""),
  defaultSceneWords: integer("default_scene_words").default(1200),
  temperature: real("temperature").default(0.7),
  globalVisualStyle: text("global_visual_style").default("dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed"),
  updatedAt: text("updated_at").notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  characters: many(characters),
  parts: many(parts),
  relationships: many(relationships),
  continuityLedgers: many(continuityLedgers),
  images: many(images),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  project: one(projects, {
    fields: [characters.projectId],
    references: [projects.id],
  }),
  abilities: many(abilities),
  changeLogs: many(changeLogs),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  project: one(projects, {
    fields: [parts.projectId],
    references: [projects.id],
  }),
  scenes: many(scenes),
  changeLogs: many(changeLogs),
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
  part: one(parts, {
    fields: [scenes.partId],
    references: [parts.id],
  }),
  versions: many(sceneVersions),
  images: many(images),
}));
