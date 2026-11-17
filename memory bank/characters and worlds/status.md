---
type: Status
title: Characters and Worlds — Status
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

## Current behavior
- Character hub loads all self/friend/canon records and groups by story.
- Universe, story, character type, faction and search filters are independent controls.
- Creation requires an explicit destination story; editing keeps the owning story fixed.
- New stories start without GOT plot or named friend defaults; existing universe names are suggested.
- Studio filters stories by universe; character import can filter the source universe.
- Missing covers/images use a neutral SVG.

# Unverified
- Creating/deleting real stories and characters was not exercised during read-only visual QA.
- Current local dataset contains one universe, so multiple-universe grouping has not been verified with live multi-universe data.
