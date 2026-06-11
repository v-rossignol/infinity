# Hexagonal Planet Specification — Review

```yaml
date: 2026-06-11
author: Roro LeSage
model: Composer
sources:
  - documentation/planets/hexagonal-planet-specification.md
  - documentation/objects/star-system.md
  - documentation/infinity-api.md
  - rules/documents.md
  - src/modules/planets/entities/planet.schema.ts
  - src/modules/planets/planets.service.ts
  - src/shared/utils/procedural-generation.ts
  - src/shared/interfaces/planet.interface.ts
```

---

## Overview

This document reviews [hexagonal-planet-specification.md](./hexagonal-planet-specification.md) against project documentation standards, related docs, and the current server implementation.

**Verdict (2026-06-11):** Hex planet feature **implemented** (Phases 1–7). REST, MongoDB surface, Socket.IO `(q, r)` movement, Redis positions, and test coverage are in place. See [development-plan.md](./development-plan.md).

---

## Summary

| Aspect | Assessment |
|--------|------------|
| Vision / gameplay concept | Good |
| Internal consistency | Good |
| Alignment with star-system doc | Good — types, id/name, radius, inheritance |
| Alignment with codebase | Implemented — REST, schema, socket `(q, r)`, Redis positions |
| Alignment with infinity-api.md | Planet `GET` documented — hex `surface` response |
| Documentation conventions | Good — status banner, fields, relationships, related links |
| Remaining spec gaps | Minor — biome resource tables, star-system odd-`radius` generation |

---

## Design decisions (recorded in spec)

| Topic | Decision |
|-------|----------|
| **Status** | Planned; tile map is current implementation |
| **Inherited fields** | `_id`, `name`, `starSystemId`, `type`, `radius`, `resources` from star-system summary |
| **Id / name** | Same as `planets[].id` / `.name` (`{starId}_planet_{index}`, e.g. `Planet 1`) |
| **Removed fields** | `position`, `distanceToStar`, `planetNumber`, `globalResources`, `hexGridSize` |
| **Orbital layout** | `x`, `y` on star-system summary only |
| **Planet types** | `rocky`, `gas`, `ice`, `lava` |
| **Type at detail gen** | Inherited — no weighted re-roll |
| **Grid size** | **`radius`** (inherited odd integer) → `radius × radius` hex cells |
| **Torus** | `% radius` on `q` and `r` in `getNeighbors` — intentional (e.g. radius 3 → 3×3 torus) |
| **Gas planets** | No surface, no entry; `422` suggested when API exists |
| **Surface generation** | Random/noise allowed; **stable after MongoDB save** |
| **Biomes** | By planet type + distance from center; `ocean` is a cell biome only |
| **Resources** | Biome predefines types; hex may have **extra finds**; detail rules deferred |
| **Danger** | `0–10` per hex; random allowed |
| **Naming** | **`Planet`** (MongoDB doc) + nested **`PlanetSurface`** (`surface.hexagons`, `surface.generatedAt`); ~~PlanetDetails~~ retired |

---

## Gaps vs. implemented code

| Topic | Spec (planned) | Code today |
|-------|----------------|------------|
| Surface | `Planet.surface` (`PlanetSurface`); `radius × radius` hex cells | `heightMap` + `tileMap` (64×64) |
| `radius` on detail doc | Inherited odd integer | Not on `Planet` schema |
| `type` on detail doc | Inherited | Not on `Planet` schema |
| Gas handling | No surface / block entry | All planets get tile surface |
| Movement | Hex `(q, r)` (planned) | `PLANET_MOVE` uses `(x, y)` |
| Star-system `radius` | Odd integer required | Fractional values (e.g. `11.4`) in examples/generator |

Reference — current schema: `src/modules/planets/entities/planet.schema.ts` (`seed`, `biomeTypes`, `heightMap`, `tileMap`). Target drops `visited` (document existence = entered).

---

## Minor open points (not blocking the spec)

### 1. Biome distance metric

The example `getBiomeForHexagon` uses Euclidean distance on axial `(q, r)`. **Hex distance** on cube coordinates may be preferred later for more regular rings. Documented as optional improvement in the spec.

### 2. Star-system generation

[star-system.md](../objects/star-system.md) and `procedural-generation.ts` must emit **odd integer** `radius` for landable planets to satisfy the hex model.

### 3. Resource detail

Biome → resource tables, extra-find rules, and link to `GET /infinity/resources/planet/:planetId` remain **deferred** by design.

### 4. infinity-api.md

Update when the hex model is implemented (response shape, gas rejection, `PLANET_MOVE` with `(q, r)`).

---

## Implementation checklist

1. Update star-system generation — odd integer `radius` for landable planets.
2. Replace `Planet` schema — nested **`surface: PlanetSurface`**, inherited fields, drop tile map fields.
3. Implement `PlanetsService` — inherit summary, generate **`PlanetSurface`**, reject gas.
4. Update [infinity-api.md](../infinity-api.md) and socket events.
5. Client — toroidal hex rendering using `getNeighbors`; disable gas entry.

---

## Related documents

- [development-plan.md](./development-plan.md) — implementation phases and test plan
- [hexagonal-planet-specification.md](./hexagonal-planet-specification.md) — full planned specification
- [star-system.md](../objects/star-system.md) — planet summaries
- [infinity-api.md](../infinity-api.md) — live API reference
- [development-plan.md](../stellar-system/development-plan.md) — implementation roadmap
- [documents.md](../../rules/documents.md) — documentation conventions
