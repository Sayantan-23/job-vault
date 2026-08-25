---
id: migration-spec
title: NestJS → Express, Nuxt → Next migration design
status: active
type: spec
created: 2026-04-26
updated: 2026-08-25T12:30:00Z
tags: [reference, migration]
---

Overall architecture of the rebuild plus the slice roadmap that [[m-01]]
executed: layered Express modules
(`router → controller → service → repository → schema`), Drizzle, the response
envelopes carried over from the Nest contract, and the App Router structure with
theme-isolated route groups.

`docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`.
