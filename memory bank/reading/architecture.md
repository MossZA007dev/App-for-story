---
type: System Architecture
title: Reading — Architecture
description: Current reading interface.
tags: [reading, ux]
status: stable
generated: { by: codex/gpt-6, at: 2026-11-11T16:40:14Z }
verified: { by: codex/gpt-6, at: 2026-11-11T16:40:14Z }
sources:
  - { id: reader, resource: "src/app/projects/[id]/read/page.tsx" }
  - { id: library, resource: src/app/sagas/SagasDashboardClient.tsx }
---

## Sources
- `src/app/sagas/SagasDashboardClient.tsx` renders real projects from the server and `/api/projects`.
- `src/app/projects/[id]/read/page.tsx` retains scene/media/audio logic; reading preferences use localStorage.
- Shared tokens and responsive layout live in `src/app/globals.css`.
- `Navbar` and `ProjectHeader` provide shared navigation.

- `tailwind.config.ts` maps amber utilities to the celadon accent palette.
- Desktop reader uses eight columns for images and four for text; gallery starts collapsed.
