import { pgTable, text, integer, real, uuid, primaryKey, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const projects = pgTable("projects", {
  ownerId: uuid("owner_id").notNull().default(sql`auth.uid()`),
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  universe: text("universe").notNull(), // e.g. Game of Thrones, Cyberpunk AU
  timelineScope: text("timeline_scope").default(""), // e.g. SS2 AU
  theme: text("theme").default(""),
  worldNotes: text("world_notes").default(""),
  storyRules: text("story_rules").notNull(), // Master story rules prompt template
  styleGuide: text("style_guide").default("dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed"),
  targetSceneWords: integer("target_scene_words").default(1200),
  coverImage: text("cover_image").default(""),
  shareCode: text("share_code").default(""),
  sfxInitialized: integer("sfx_initialized").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const characters = pgTable("characters", {
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
  characterType: text("character_type", { enum: ["self", "friend", "canon", "narrator"] }).default("canon"),
  realNickname: text("real_nickname").default(""),
  avatarUrl: text("avatar_url").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const abilities = pgTable("abilities", {
  id: text("id").primaryKey(),
  characterId: text("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  origin: text("origin").default(""),
  linkToPersonality: text("link_to_personality").default(""),
  cost: text("cost").default(""),
  gainedAtPart: integer("gained_at_part").default(1),
  lostAtPart: integer("lost_at_part"),
});

export const relationships = pgTable("relationships", {
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

export const parts = pgTable("parts", {
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

export const episodes = pgTable("episodes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  partId: text("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  number: integer("number").notNull(), // EP 1, EP 2...
  title: text("title").notNull(),
  summary: text("summary").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const scenes = pgTable("scenes", {
  id: text("id").primaryKey(),
  partId: text("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  episodeId: text("episode_id"),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  location: text("location").default(""),
  charactersPresent: text("characters_present").default("[]"), // JSON string array of names or IDs
  contentMarkdown: text("content_markdown").default(""),
  summary: text("summary").default(""), // AI 3-5 line summary
  wordCount: integer("word_count").default(0),
  version: integer("version").default(1),
  directorNote: text("director_note").default(""),
  bgmUrl: text("bgm_url").default(""),
  bgmTitle: text("bgm_title").default(""),
  dialogueBindings: text("dialogue_bindings").default("{}"),
  lastEditedBy: text("last_edited_by").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sceneVersions = pgTable("scene_versions", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id").notNull().references(() => scenes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  contentMarkdown: text("content_markdown").default(""),
  summary: text("summary").default(""),
  directorNote: text("director_note").default(""),
  createdAt: text("created_at").notNull(),
});

export const changeLogs = pgTable("change_logs", {
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

export const continuityLedgers = pgTable("continuity_ledgers", {
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

export const images = pgTable("images", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sceneId: text("scene_id"),
  characterId: text("character_id"),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt").default(""),
  provider: text("provider").notNull(), // openai, replicate, stability
  seed: text("seed"),
  filePath: text("file_path").notNull(),
  kind: text("kind", { enum: ["portrait", "scene", "cover", "movie_still", "reference"] }).notNull(),
  approved: integer("approved").default(0), // 0: rejected/pending, 1: approved
  caption: text("caption").default(""),
  metadata: text("metadata").default("{}"),
  createdAt: text("created_at").notNull(),
});

export const collaborators = pgTable("collaborators", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nickname: text("nickname").default(""),
  avatarUrl: text("avatar_url").default(""),
  characterId: text("character_id"),
  role: text("role", { enum: ["owner", "co_author", "editor", "viewer"] }).default("co_author"),
  canEditScenes: integer("can_edit_scenes").default(1),
  canUploadMedia: integer("can_upload_media").default(1),
  canGenerateAi: integer("can_generate_ai").default(1),
  lastActiveAt: text("last_active_at"),
  createdAt: text("created_at").notNull(),
});

export const appSettings = pgTable("app_settings", {
  ownerId: uuid("owner_id").notNull().default(sql`auth.uid()`),
  id: text("id").notNull(), // "global"
  anthropicApiKey: text("anthropic_api_key").default(""),
  anthropicModel: text("anthropic_model").default("claude-3-5-sonnet-20241022"),
  geminiApiKey: text("gemini_api_key").default(""),
  geminiModel: text("gemini_model").default("gemini-2.5-flash"),
  textAiProvider: text("text_ai_provider").default("claude"),
  imageProvider: text("image_provider").default("openai"),
  imageApiKey: text("image_api_key").default(""),
  defaultSceneWords: integer("default_scene_words").default(1200),
  temperature: real("temperature").default(0.7),
  globalVisualStyle: text("global_visual_style").default("dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed"),
  updatedAt: text("updated_at").notNull(),
}, (t) => [primaryKey({columns:[t.id,t.ownerId]})]);

export const soundEffects = pgTable("sound_effects", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").default("general"), // action, atmosphere, magic, horror, emotion, weapon, general
  audioUrl: text("audio_url").notNull(),
  sourceType: text("source_type", { enum: ["upload", "url", "synth"] }).default("upload"),
  durationSeconds: real("duration_seconds").default(0),
  volume: real("volume").default(0.8),
  tags: text("tags").default("[]"),
  description: text("description").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  characters: many(characters),
  parts: many(parts),
  relationships: many(relationships),
  continuityLedgers: many(continuityLedgers),
  images: many(images),
  collaborators: many(collaborators),
  soundEffects: many(soundEffects),
}));

export const soundEffectsRelations = relations(soundEffects, ({ one }) => ({
  project: one(projects, {
    fields: [soundEffects.projectId],
    references: [projects.id],
  }),
}));

export const collaboratorsRelations = relations(collaborators, ({ one }) => ({
  project: one(projects, {
    fields: [collaborators.projectId],
    references: [projects.id],
  }),
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

export const projectMembers = pgTable('project_members',{id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>projects.id,{onDelete:'cascade'}),userId:uuid('user_id').notNull(),role:text('role',{enum:['editor','reader']}).notNull(),createdAt:text('created_at').notNull()});
export const mediaAssets=pgTable('media_assets',{id:text('id').primaryKey(),ownerId:uuid('owner_id').notNull().default(sql`auth.uid()`),projectId:text('project_id').references(()=>projects.id,{onDelete:'set null'}),kind:text('kind',{enum:['images','audio']}).notNull(),storagePath:text('storage_path').notNull(),contentType:text('content_type').notNull(),createdAt:text('created_at').notNull()});
export const privateDocuments=pgTable('private_documents',{id:text('id').notNull(),ownerId:uuid('owner_id').notNull().default(sql`auth.uid()`),ciphertext:text('ciphertext').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.id,t.ownerId]})]);
export const sceneNarrations=pgTable('scene_narrations',{sceneId:text('scene_id').primaryKey().references(()=>scenes.id,{onDelete:'cascade'}),projectId:text('project_id').notNull().references(()=>projects.id,{onDelete:'cascade'}),manifest:text('manifest').notNull(),updatedAt:text('updated_at').notNull()});
export const readingProgress=pgTable('reading_progress',{projectId:text('project_id').notNull().references(()=>projects.id,{onDelete:'cascade'}),userId:uuid('user_id').notNull().default(sql`auth.uid()`),sceneId:text('scene_id').notNull().references(()=>scenes.id,{onDelete:'cascade'}),blockIndex:integer('block_index').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.projectId,t.userId]})]);

export const accountProfiles=pgTable('account_profiles',{
 userId:uuid('user_id').primaryKey().default(sql`auth.uid()`),
 displayName:text('display_name').notNull().default(''),
 bio:text('bio').notNull().default(''),
 avatarPath:text('avatar_path').notNull().default(''),
 updatedAt:text('updated_at').notNull(),
});
export const bookmarks=pgTable('bookmarks',{
 id:text('id').primaryKey(),userId:uuid('user_id').notNull().default(sql`auth.uid()`),
 projectId:text('project_id').notNull().references(()=>projects.id,{onDelete:'cascade'}),
 sceneId:text('scene_id').references(()=>scenes.id,{onDelete:'cascade'}),
 blockIndex:integer('block_index').notNull().default(0),note:text('note').notNull().default(''),createdAt:text('created_at').notNull(),
});
export const projectInvitations=pgTable('project_invitations',{id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>projects.id,{onDelete:'cascade'}),tokenHash:text('token_hash').notNull(),role:text('role').notNull(),createdBy:uuid('created_by').notNull().default(sql`auth.uid()`),expiresAt:timestamp('expires_at',{withTimezone:true,mode:'string'}).notNull(),revoked:boolean('revoked').notNull().default(false),acceptedBy:uuid('accepted_by'),createdAt:timestamp('created_at',{withTimezone:true,mode:'string'}).notNull().defaultNow()});
