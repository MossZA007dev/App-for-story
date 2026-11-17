# Saga Forge design system

## Direction
Cinematic, image-led fiction. The first visible story uses an edge-to-edge landscape feature; subsequent covers are generous 16:9 images. Reader media occupies eight of twelve desktop columns and the available viewport height. Mobile stacks a large visual above readable prose. Text focus remains optional.

## Tokens
Charcoal green background #0c100f, surface #141b18, raised #1c2622, line #303e37, text #edf2ee, secondary #a7b8ae, celadon accent #8ed8be. CSS custom properties are defined in globals.css; existing amber Tailwind utilities map to the celadon scale and slate utilities map to green-tinted neutrals for consistent controls across workspaces. Error and status colors remain semantic.

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
