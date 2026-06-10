# Infinity - Stellar System Development Plan

```yaml
date: 2026-06-10
author: Roro LeSage
model: GPT-5.5
sources:
  - src/modules/galaxy/entities/star-system.schema.ts
  - src/modules/galaxy/galaxy.service.ts
  - src/modules/galaxy/galaxy.controller.ts
  - src/modules/galaxy/galaxy.module.ts
  - src/shared/utils/procedural-generation.ts
  - documentation/stellar-system/stellar-system-summary.md
  - documentation/infinity-api.md
```

## Overview

This plan tracks the **stellar system** feature in the Infinity server. It reflects the current implementation first, then lists remaining work separately so planned behavior is not presented as shipped behavior.

---

## Current implementation

| Area | Status | Source |
|------|--------|--------|
| MongoDB schema | Implemented as `StarSystem` in the `galaxy` module | `src/modules/galaxy/entities/star-system.schema.ts` |
| Generation utility | Implemented by `generateStarSystem({ seed })` | `src/shared/utils/procedural-generation.ts` |
| Service orchestration | Implemented by `GalaxyService.getStarSystem()` and `GalaxyService.generateStarSystem()` | `src/modules/galaxy/galaxy.service.ts` |
| REST endpoint | Implemented as `GET /infinity/galaxy/systems/:systemId` | `src/modules/galaxy/galaxy.controller.ts` |
| Dedicated module | Not implemented; the feature is registered in `GalaxyModule` | `src/modules/galaxy/galaxy.module.ts` |
| Redis cache | Not implemented for stellar systems | `AGENTS.md` |
| WebSocket updates | Not implemented for stellar systems | `src/modules/socket/` |

---

## Implemented flow

1. A client calls `GET /infinity/galaxy/systems/:systemId`.
2. `GalaxyService.getStarSystem()` looks up a MongoDB `StarSystem` document by `_id`.
3. If the document does not exist, `GalaxyService.generateStarSystem()` calls `generateStarSystem({ seed: systemId })`.
4. The generated data is saved with `_id: systemId`, `visited: true`, and a `createdAt` value.
5. The saved or existing MongoDB document is returned to the client.

---

## Implemented data model

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `string` | System identifier supplied by the route parameter. |
| `name` | `string` | Generated as `Star System {seed-prefix}`. |
| `stars` | `object[]` | Local stars generated for this system. |
| `planets` | `object[]` | Lightweight planet summaries generated inside the system document. |
| `visited` | `boolean` | Defaults to `false`; generated systems are saved with `true`. |
| `createdAt` / `updatedAt` | `Date` | Added by Mongoose timestamps. |

---

## Remaining work

| Priority | Work item | Notes |
|----------|-----------|-------|
| 1 | Add focused tests for `GalaxyService.getStarSystem()` | Cover lookup, generation on miss, persistence, and returned document shape. |
| 2 | Add tests for `generateStarSystem()` | Current generation mixes seeded noise with `Math.random()`, so tests should either mock randomness or first make generation deterministic. |
| 3 | Decide the relationship between `StarSystem.planets` and `Planet` documents | The system embeds lightweight planet summaries, while `PlanetsModule` generates detailed planet documents by `planetId`. |
| 4 | Document or adjust authentication | The route is currently public; cube and star endpoints are JWT-protected. |
| 5 | Evaluate Redis caching | Cache only if MongoDB lookup/generation becomes a bottleneck. |
| 6 | Evaluate WebSocket events | Add events only when clients need live stellar system updates. |

---

## Planned test coverage

| Scope | Test cases |
|-------|------------|
| Unit | Existing system is returned without regeneration. |
| Unit | Missing system is generated, saved, marked `visited`, and returned. |
| Unit | Generated system contains `name`, `stars`, and `planets` matching the schema. |
| Integration | `GET /infinity/galaxy/systems/:systemId` returns an existing or generated system. |
| Integration | Generated documents persist in MongoDB with `_id` equal to `systemId`. |

---

## Related documents

- [Stellar System Summary](stellar-system-summary.md)
- [Infinity API](../infinity-api.md)
- [Cube Object](../objects/cube.md)
- [Star Object](../objects/star.md)
