---
type: Playbook
title: Characters and Worlds — Gotchas
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

## Identity
- Characters are versions within stories. There is no global person ID or master profile model; do not imply edits synchronize across stories.
- Import copies prior records into a new story form; review role, faction, name and background for the new world.
- Universe names are free text. Reuse a suggested name for consistent grouping; a separate universe table does not exist.
- Narrator records are excluded from the global self/friend/canon hub.
- Existing story and cast data must not be rewritten while removing GOT defaults from creation flows.
