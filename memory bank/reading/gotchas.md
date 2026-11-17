---
type: Playbook
title: Reading — Gotchas
description: Current reading interface.
tags: [reading, ux]
status: stable
generated: { by: codex/gpt-6, at: 2026-11-11T16:40:14Z }
verified: { by: codex/gpt-6, at: 2026-11-11T16:40:14Z }
sources:
  - { id: reader, resource: "src/app/projects/[id]/read/page.tsx" }
  - { id: library, resource: src/app/sagas/SagasDashboardClient.tsx }
---

## Runtime
- Use Node 22 as specified by package.json; better-sqlite3 does not compile with the installed Node 26.
- Next dev may choose a different port if 3000 is occupied.
- Reader scene selection also controls media/audio bindings; preserve these handlers when changing layout.
