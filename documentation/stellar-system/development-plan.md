# Infinity - Stellar System Development Plan

```yaml
date: 2026-06-10
author: Roro LeSage
model: Composer
sources:
  - src/modules/galaxy/entities/star-system.schema.ts
  - src/modules/galaxy/entities/star.schema.ts
  - src/modules/galaxy/star-system.service.ts
  - src/modules/galaxy/galaxy.service.ts
  - src/modules/galaxy/galaxy.controller.ts
  - src/modules/galaxy/galaxy.module.ts
  - src/modules/planets/planets.controller.ts
  - src/modules/planets/planets.service.ts
  - src/shared/utils/procedural-generation.ts
  - documentation/stellar-system/stellar-system-summary.md
  - documentation/objects/star.md
  - documentation/objects/star-system.md
```

## Overview

This plan tracks delivery of the **stellar system** feature: the inner view (planets, local layout) when a player **enters** a cube **Star**. Domain rules and legacy behavior are defined in [Stellar System Summary](stellar-system-summary.md). Gaps are tracked in [Code Alignment Audit](code-alignment-audit.md).

---

## Intended model (target)

| Rule | Description |
|------|-------------|
| Star persistence | Stars live in `stars` when a cube is explored; they are never removed on entry. |
| Cube content | A cube contains **stars only** — not stellar systems or planets. |
| Star prerequisite | A **Star must exist** before a **StarSystem** can be created (**404** otherwise). |
| Shared identity | `StarSystem._id` = `Star.id` (same UUID). |
| Shared name | `StarSystem.name` = `Star.name` (same display name). |
| Lazy creation | **Get-or-create** on `GET /infinity/galaxy/systems/:starId` — return existing or generate once, then reuse. |
| Cube stars | **Always kept** in cube / `stars` — lightweight map structure; never removed on enter-star. |
| Content | `StarSystem` holds **planets** (and local layout). Star attributes stay on **Star**. |
| Entry API | `GET /infinity/galaxy/systems/:starId` — `starId` must be an existing cube star UUID. |
| Generation | Non-deterministic on first build; seed = star UUID; star/cube properties do **not** alter layout |
| Entry auth | **JWT** — same as cube and star routes |

---

## Current implementation

| Area | Status | Source |
|------|--------|--------|
| MongoDB schema | `StarSystem` with `planets[]` only (no `stars[]`) | `star-system.schema.ts` |
| Generation | `generateStarSystem({ seed: starId })` — planets only; star properties unchanged | `procedural-generation.ts` |
| Service | Star lookup on create; `name` from `Star` | `star-system.service.ts` |
| REST route | `GET /infinity/galaxy/systems/:systemId` (JWT) | `galaxy.controller.ts` |
| Star linkage | Star required on create; parent star loaded separately | — |
| Shared UUID | **Aligned** — `_id` = star UUID; 404 if star missing | `star-system.service.ts` |
| Shared name | **Aligned on create** — `StarSystem.name` = `Star.name` | `star-system.service.ts` |
| Planet details | `GET /infinity/planets/:planetId?systemId=` (interim) | `planets.controller.ts` |
| Redis / WebSocket | Not implemented | — |

### Flow (shipped)

1. Client calls `GET /infinity/galaxy/systems/:systemId` with a **star UUID**.
2. Lookup `StarSystem` by `_id`; on miss, verify **Star** exists (**404** if not).
3. Generator runs; **`name`** copied from **Star**; persist with `planets[]`, `visited: true`.

---

## Migration phases

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| **0 — Documentation** | Docs only | Intended vs legacy documented (this folder) |
| **1 — Identity** | Code | **Done** — require existing `Star`; `_id = Star.id`; `name = Star.name`; 404 if missing |
| **2 — Schema** | Code | **Done** — removed `StarSystem.stars[]`; cube stars unchanged |
| **3 — Generation** | Code | **Done** — seed from star UUID; star/cube properties do not alter generation |
| **4 — API polish** | Code + docs | **Partial** — JWT on enter-star route; rename param to `:starId` still open |
| **5 — Planets** | Code | Default `Planet.starSystemId` from path when `_id` is star UUID; deprecate query param if redundant |
| **6 — Quality** | Tests | Unit + integration coverage per [Planned test coverage](#planned-test-coverage) |

Phase **0–3** and auth (phase **4**) are complete. Phases **4** (param rename), **5**, and **6** remain open.

---

## Remaining work

| Priority | Work item | Phase | Notes |
|----------|-----------|-------|-------|
| 1 | Star existence check before generation | 1 | **Done** — `NotFoundException` if star missing |
| 2 | Align `_id` and `name` from parent `Star` | 1 | **Done** — `_id = systemId`, `name = Star.name` on create |
| 3 | Remove embedded `StarSystem.stars[]` | 2 | **Done** |
| 4 | Planet generator seed | 3 | **Done** — `seed = starId`; star properties do not change output |
| 5 | Controller param rename `:starId` | 4 | Optional alias period for `:systemId` |
| 6 | Auth for enter-star route | 4 | **Done** — JWT (aligned with cube/star routes) |
| 7 | Tests for `StarSystemService` | 6 | See test table below |
| 8 | Redis / WebSocket evaluation | 6 | Only if needed after alignment |

| Scope | Test case |
|-------|-----------|
| Unit | Existing `StarSystem` returned without regeneration |
| Unit | Missing system generated when parent `Star` exists |
| Unit | Unknown `starId` → not found (no generation) |
| Unit | `StarSystem._id` equals `Star.id` |
| Unit | `StarSystem.name` equals `Star.name` |
| Unit | Response has `planets`; no `stars[]` field | **Done** |
| Unit | `generateStarSystem` / successor: mock `Math.random()` |
| Integration | `GET /infinity/galaxy/systems/:starId` happy path |
| Integration | `GET /infinity/planets/:planetId?systemId={starId}` sets `starSystemId` |

---

## Out of scope (for now)

- Migrating or deleting historical legacy documents with arbitrary `_id` values
- Linking stellar systems to cube coordinates without going through `Star.id`
- Replacing the cube galaxy generator (`generateCube`) or **removing stars from cubes**

---

## Related documents

- [Stellar System index](./README.md)
- [Stellar System Summary](stellar-system-summary.md)
- [Code Alignment Audit](code-alignment-audit.md)
- [Star Object](../objects/star.md)
- [Star System Object](../objects/star-system.md)
- [Infinity API](../infinity-api.md)
