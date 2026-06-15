# Infinity - Stellar System Code Alignment Audit

```yaml
date: 2026-06-10
author: Roro LeSage
model: Composer
sources:
  - src/modules/galaxy/entities/star-system.schema.ts
  - src/modules/galaxy/entities/star.schema.ts
  - src/modules/galaxy/star-system.service.ts
  - src/modules/galaxy/galaxy.controller.ts
  - src/modules/planets/planets.service.ts
  - src/modules/planets/planets.controller.ts
  - src/shared/utils/procedural-generation.ts
  - documentation/stellar-system/stellar-system-summary.md
  - documentation/stellar-system/development-plan.md
  - documentation/objects/star.md
```

## Overview

This audit tracks alignment between the **stellar system model**, **code**, and **documentation** in `documentation/stellar-system/`.

| Layer | Status |
|-------|--------|
| Documentation | **Complete** — see [summary](stellar-system-summary.md) |
| Code vs model | **Partial** — phases 4–6 in [development plan](development-plan.md) |
| Code vs docs | **Aligned** for schema, identity, and generation (planets only) |

---

## Model vs code

| Rule | Code |
|------|------|
| `StarSystem._id` = `Star.id` (UUID) | **Aligned** — star UUID required; 404 if missing |
| `StarSystem.name` = `Star.name` | **Aligned** — copied on create; 404 if star missing |
| System created only when entering an existing star | **Aligned** — 404 when `Star` not found |
| Cube `Star` persists; not duplicated in system | **Aligned** — no `StarSystem.stars[]` |
| System content = planets (+ local layout) | **Aligned** — `planets[]` only |
| Non-deterministic first generation | **Aligned** |
| Stable after MongoDB persistence | **Aligned** |
| Planet generation seeded by star UUID | **Aligned** — `generateStarSystem({ seed: starId })`; star properties unchanged |
| Enter-star route auth | **Aligned** — JWT (same as cube/star routes) |
| `Planet.starSystemId` = star UUID on first load | **Partial** — optional `?systemId=` query (interim) |
| Route param named `:starId` | **Gap** — still `:systemId` (phase 4) |

---

## Documentation checklist

| Topic | Document | Status |
|-------|----------|--------|
| Star vs StarSystem terminology | Summary | Done |
| Cube contains stars only | Summary, README, cube.md | Done |
| Star must exist before StarSystem | Summary, code | Done |
| API and MongoDB shape (no `stars[]`) | Summary, infinity-api | Done |
| Generation formulas (planets only) | Summary | Done |
| Migration phases and priorities | Development plan | Done |
| Planet `?systemId=` interim linkage | Summary, infinity-api | Done |
| Gap matrix (this file) | Audit | Done |

---

## Open work (code)

All items map to [development-plan.md](development-plan.md) migration phases **4–6**:

1. ~~Validate `Star` exists before creating `StarSystem`.~~ **Done**
2. ~~Copy **`_id` and `name`** from the parent `Star`.~~ **Done**
3. ~~Remove embedded `stars[]`.~~ **Done**
4. ~~Seed planet generation from star UUID (no star-property influence).~~ **Done**
5. ~~JWT on enter-star route.~~ **Done**
6. Rename route param to `:starId` (phase 4).
7. Expand `star-system.service` / integration tests (phase 6).

---

## Related documents

- [Stellar System index](./README.md)
- [Stellar System Summary](stellar-system-summary.md)
- [Development Plan](development-plan.md)
- [Star Object](../objects/star.md)
- [Infinity API](../infinity-api.md)
