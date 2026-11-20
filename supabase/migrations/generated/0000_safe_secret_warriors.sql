CREATE TABLE "abilities" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"name" text NOT NULL,
	"origin" text DEFAULT '',
	"link_to_personality" text DEFAULT '',
	"cost" text DEFAULT '',
	"gained_at_part" integer DEFAULT 1,
	"lost_at_part" integer
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"id" text NOT NULL,
	"anthropic_api_key" text DEFAULT '',
	"anthropic_model" text DEFAULT 'claude-3-5-sonnet-20241022',
	"gemini_api_key" text DEFAULT '',
	"gemini_model" text DEFAULT 'gemini-2.5-flash',
	"text_ai_provider" text DEFAULT 'claude',
	"image_provider" text DEFAULT 'openai',
	"image_api_key" text DEFAULT '',
	"default_scene_words" integer DEFAULT 1200,
	"temperature" real DEFAULT 0.7,
	"global_visual_style" text DEFAULT 'dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed',
	"updated_at" text NOT NULL,
	CONSTRAINT "app_settings_id_owner_id_pk" PRIMARY KEY("id","owner_id")
);
--> statement-breakpoint
CREATE TABLE "change_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"part_id" text NOT NULL,
	"character_id" text NOT NULL,
	"mbti_before" text NOT NULL,
	"mbti_after" text NOT NULL,
	"trigger_event" text NOT NULL,
	"beliefs" text DEFAULT '',
	"losses" text DEFAULT '',
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"gender" text DEFAULT '',
	"start_mbti" text DEFAULT '',
	"current_mbti" text DEFAULT '',
	"role_options" text DEFAULT '[]',
	"chosen_role" text DEFAULT '',
	"role_reason" text DEFAULT '',
	"faction" text DEFAULT '',
	"background" text DEFAULT '',
	"status" text DEFAULT 'alive',
	"location_now" text DEFAULT '',
	"visual_sheet" text DEFAULT '{}',
	"character_type" text DEFAULT 'canon',
	"real_nickname" text DEFAULT '',
	"avatar_url" text DEFAULT '',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaborators" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"nickname" text DEFAULT '',
	"avatar_url" text DEFAULT '',
	"character_id" text,
	"role" text DEFAULT 'co_author',
	"can_edit_scenes" integer DEFAULT 1,
	"can_upload_media" integer DEFAULT 1,
	"can_generate_ai" integer DEFAULT 1,
	"last_active_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "continuity_ledgers" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"scene_id" text,
	"part_id" text,
	"ledger_data" text NOT NULL,
	"is_current" integer DEFAULT 1,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"part_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"scene_id" text,
	"character_id" text,
	"prompt" text NOT NULL,
	"negative_prompt" text DEFAULT '',
	"provider" text NOT NULL,
	"seed" text,
	"file_path" text NOT NULL,
	"kind" text NOT NULL,
	"approved" integer DEFAULT 0,
	"caption" text DEFAULT '',
	"metadata" text DEFAULT '{}',
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"project_id" text,
	"kind" text NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"scope" text DEFAULT '',
	"theme" text DEFAULT '',
	"peak_summary" text DEFAULT '',
	"status" text DEFAULT 'planned',
	"character_change_summary" text DEFAULT '',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "private_documents" (
	"id" text NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"ciphertext" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "private_documents_id_owner_id_pk" PRIMARY KEY("id","owner_id")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"universe" text NOT NULL,
	"timeline_scope" text DEFAULT '',
	"theme" text DEFAULT '',
	"world_notes" text DEFAULT '',
	"story_rules" text NOT NULL,
	"style_guide" text DEFAULT 'dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed',
	"target_scene_words" integer DEFAULT 1200,
	"cover_image" text DEFAULT '',
	"share_code" text DEFAULT '',
	"sfx_initialized" integer DEFAULT 0,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"project_id" text NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"scene_id" text NOT NULL,
	"block_index" integer NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "reading_progress_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"char_a" text NOT NULL,
	"char_b" text NOT NULL,
	"type" text NOT NULL,
	"trust_level" integer DEFAULT 0,
	"note" text DEFAULT '',
	"changed_at_scene" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_narrations" (
	"scene_id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"manifest" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"content_markdown" text DEFAULT '',
	"summary" text DEFAULT '',
	"director_note" text DEFAULT '',
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"part_id" text NOT NULL,
	"episode_id" text,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"location" text DEFAULT '',
	"characters_present" text DEFAULT '[]',
	"content_markdown" text DEFAULT '',
	"summary" text DEFAULT '',
	"word_count" integer DEFAULT 0,
	"version" integer DEFAULT 1,
	"director_note" text DEFAULT '',
	"bgm_url" text DEFAULT '',
	"bgm_title" text DEFAULT '',
	"dialogue_bindings" text DEFAULT '{}',
	"last_edited_by" text DEFAULT '',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sound_effects" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'general',
	"audio_url" text NOT NULL,
	"source_type" text DEFAULT 'upload',
	"duration_seconds" real DEFAULT 0,
	"volume" real DEFAULT 0.8,
	"tags" text DEFAULT '[]',
	"description" text DEFAULT '',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abilities" ADD CONSTRAINT "abilities_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_logs" ADD CONSTRAINT "change_logs_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_logs" ADD CONSTRAINT "change_logs_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "continuity_ledgers" ADD CONSTRAINT "continuity_ledgers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_char_a_characters_id_fk" FOREIGN KEY ("char_a") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_char_b_characters_id_fk" FOREIGN KEY ("char_b") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_narrations" ADD CONSTRAINT "scene_narrations_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_narrations" ADD CONSTRAINT "scene_narrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_versions" ADD CONSTRAINT "scene_versions_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_effects" ADD CONSTRAINT "sound_effects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;