## Immersive reading experience

The reader is a separate full-viewport story stage with no editor/sidebar controls. Keep real scene media prominent, dim edges with layered gradients, use restrained crossfades and slow artwork movement, and render dialogue in consistent per-speaker left/right positions. Narration is centered and unboxed with a soft gradient. Display the active passage and a small amount of prior dialogue; support manual and automatic stepping, plus a continuous text mode sharing the same active passage.

A floating glass dock contains previous/next, timed auto advance, TOC, audio, preferences, and fullscreen. Settings and TOC use modal dialogs with native keyboard focus management. Support large text, long passages, small screens, reduced motion, video pauses, visible focus, and local reading-position persistence. Use honest empty states when scenes or artwork are missing. Do not generate speech automatically or imply that timed text progression is spoken narration.

# Current theme: smoked-glass cinema

The latest user reference supersedes the light paper palette: use deep olive/charcoal backgrounds, translucent smoky panels, off-white text, subtle reflective borders, and restrained red primary actions. Keep the sidebar and the compact card/toolbar layouts. Do not copy Netflix branding or add fictional profile data. The Studio uses large landscape story artwork with legible overlays, compact real statistics, an accurate progress indicator, and separate write/read actions. Deletion remains behind the existing confirmation flow via the overflow menu.

Shared theme and responsive styles now live in `src/app/app-theme.css`, loaded after the base component styles. Light paper colors are replaced across inputs, dialogs, characters, library, writer, reader, and settings. The old paper-theme file is retired. Keep focus outlines, readable contrast, keyboard access, and reduced-motion behavior.

---

# Current visual direction: Paper library

The current UI follows a minimal reading-library direction inspired by the user's Kindle reference. This supersedes the earlier monochrome cinema direction below. Use warm off-white (#f7f6f2), white surfaces, charcoal text (#292823), quiet sand borders, and a restrained amber action color. Color comes primarily from covers and scene artwork.

Desktop navigation is a fixed left rail; mobile uses a compact top navigation. The library features a small “หยิบมาอ่าน” row and a portrait-cover bookshelf, with no duplicate full-screen featured story. Keep controls compact, text readable, borders subtle, and avoid glow effects. Do not invent profile data or reading-progress values. Existing universe filters, collaboration, writing tools, imports, character variants, and reading controls remain functional.

Shared light tokens and layout live in `src/app/paper-theme.css`, loaded after the foundational component styles in `globals.css`. Its compatibility palette supports legacy workspace utilities while screens move to semantic surfaces. Modals, narration controls, forms, project tabs, and reader panels share the paper palette. Artwork and video frames retain appropriate contrast. Respect reduced-motion preferences and keep keyboard focus visible.

Verification: visually checked library, character hub, studio, settings, writer, and reader; tested library search at 390px with no horizontal overflow, and checked the desktop sidebar at 1440px. No manuscript or credential changes are part of the redesign.

---

# Saga Forge design system

## Direction
Cinematic, image-led fiction. The first visible story uses an edge-to-edge landscape feature; subsequent covers are generous 16:9 images. Reader media occupies eight of twelve desktop columns and the available viewport height. Mobile stacks a large visual above readable prose. Text focus remains optional.

## Tokens
Monochrome cinema: background #080808, surface #141414, raised #202020, line #333333, text #f5f5f5, secondary #aaaaaa, white accent #ffffff. CSS custom properties are defined in globals.css; existing amber Tailwind utilities map to the white/gray scale and slate utilities map to neutral grays for consistent controls across workspaces. Error and status colors remain semantic.

## Typography and behavior
Sarabun for Thai UI/prose; Cinzel only for the brand. Display story titles 28–48px; reader text 16–26px. Media scrims protect text contrast. Shared two-row mobile navigation, visible focus, reduced motion and existing local APIs are retained. Reading font size persists. Cinematic focus uses its own preference key so images are visible by default on first use of this layout.

## Character and writing workspaces
Universe and story are independent selectors. The character hub groups cards by their owning story and distinguishes self, friend and canon. Portrait cards retain neutral styling with the original hanging house banners for recognized GOT factions only. Factions come from stored data, with a surname fallback only when faction is empty. Other universes and unrecognized factions receive no GOT banner. Character records remain per-story versions, not global identities. New story forms start empty, suggest existing universe names, and can import self/friend records from existing stories. Missing artwork uses a neutral placeholder.

## Writing room
The scene editor presents labeled Part/Episode/Scene selectors, one save control and a reader link. Story structure, collaboration and scene audio are in a native disclosure. Visual editing tools sit above the large image in their own disclosure. The manuscript shows speaker and text first; a per-line-tools toggle reveals media bindings, ordering and deletion. Audition controls and captions are expandable. Existing save/stream/scene handlers remain in use.

## Character dialog
The shared create/edit dialog uses a fixed header and footer with a scrolling form body. Story selection is grouped by universe; identity and story-role fields are separate sections. Short Thai labels are associated with every input. Optional gender and MBTI start unspecified. Photo upload remains optional and supports the existing crop flow. The layout uses two columns on desktop and one on mobile, with a consistent accent for all character types. Tab focus stays in the dialog, Escape closes it, background scrolling is locked, and focus returns to the trigger.

## Paste-to-story creation
The new-story page offers manual and pasted-text modes. Paste mode preserves rendered HTML tables as Markdown, previews editable story metadata, cast and part/scene content, and creates through one transactional endpoint. Local extraction requires no key; AI extraction is a separate explicit action using the configured text provider. Missing title/universe must be supplied by the author. Character types are reviewed explicitly; future skill goals remain role notes. Original text is retained in world notes. No draft is persisted until the create action.

Paste previews expose scene locations, character counts, source character counts per scene and editable per-part notes. Initial profiles are isolated from later change logs. Scene bodies are sliced from source even when AI enriches metadata, preventing model output limits from truncating prose. Future outlines create planned parts without fabricated scenes. Part notes remain accessible through the existing edit-part dialog after creation.

## Read aloud
A compact player stays available in standard, focus and fullscreen reader modes. Device speech reads short Thai-aware chunks, advances the existing paragraph highlight, supports voice/rate selection and pause/resume/stop. Sound-effect blocks are skipped. Generation tokens prevent cancelled utterances from advancing after seeking or changing scenes. Background music ducks while speaking and restores on pause/end; speech has independent audibility from music mute. No AI API key is needed, and Thai voice availability is surfaced explicitly.

## ElevenLabs narration
The reader offers device speech and an expandable ElevenLabs panel. A short editable sample is the default; whole-scene generation is explicit. Planning shows missing versus cached segments and estimated credits before a separate confirmation. Cached MP3 clips have native audio controls and preserve the existing paragraph highlight and music ducking. The empty state links directly to private API key setup. Missing keys, quota exhaustion and provider failures leave existing audio intact. The panel scrolls within desktop reader height constraints.

## Scene voice panel
Saved scene playback is shown before generation controls. Whole-scene and short-test modes are a two-option switch; casting lives in a single disclosure with three default voices and speaker rows. Gender comes only from stored character data, with a narrator fallback for unknown values and explicit per-person overrides. Credit review stays separate from generation confirmation. Complete scene audio is attached automatically and restored on refresh. A stale attachment is labelled and its paragraph highlighting disabled until refreshed. Desktop panel height is bounded so the cinematic reader remains usable; mobile controls stack.

The cinematic library uses a large photographic feature, black scrims, generous white titles and white action buttons. Artwork and house heraldry retain their original color; interface chrome is black, white and gray. Status and error colors remain semantic.

## OpenAI scene assistant
A named disclosure in the manuscript panel separates analysis from full-scene generation. Authors enter direction and length, see analysis and edit a proposed draft before explicitly applying it. Missing-key states link to settings, unavailable actions are disabled, and stale drafts cannot overwrite newer manuscript metadata or content. This feature uses the monochrome form and action styles.

## Undo and recovery
Three compact controls above the manuscript expose Undo, Redo and saved scene history. Standard Mac/Windows shortcuts mirror the controls; undo availability is visible and disabled during saving/streaming. A native modal dialog provides a version selector, read-only preview and explicit restore action. AI errors never enter manuscript state.


### Automatic scene-image dialog

Scene images now use a compact monochrome OpenAI dialog. The default path requires only “สร้างภาพฉาก”; prompt writing and character selection are optional advanced controls. The server reads the current scene, selects relevant characters, prepares the image brief, and attaches the result without overwriting unsaved writing. The dialog shows progress, prevents duplicate submissions, and preserves the form after errors.
