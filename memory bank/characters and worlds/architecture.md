---
type: System Architecture
title: Characters and Worlds — Architecture
description: Current character and multi-universe workflows.
tags: [characters, universes, stories]
status: stable
generated: { by: codex/gpt-6, at: 2026-11-11T16:58:14Z }
verified: { by: codex/gpt-6, at: 2026-11-11T16:58:14Z }
sources:
  - { id: hub, resource: src/app/characters/page.tsx }
  - { id: api, resource: src/app/api/characters/route.ts }
  - { id: new-story, resource: src/app/projects/new/page.tsx }
  - { id: modal, resource: src/components/characters/CreateCharacterModal.tsx }
---

## Data flow
- `/api/projects` supplies story IDs and free-text universe names.
- `/api/characters?includeCanon=true` joins character records to their owning story/universe.
- `/characters` filters these records; `?project=<id>` opens a specific story context.
- `CreateCharacterModal` posts to the selected project route and edits through the original owning project route.
- `/projects/new` and `ImportFromHubModal` reuse existing project and character APIs.
- `/projects/[id]/characters` retains abilities, visual sheets and development details.
- `getProjects.ts` and the image route use `public/images/story-placeholder.svg` for missing artwork.
