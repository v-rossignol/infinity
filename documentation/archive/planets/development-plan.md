# Hexagonal Planet Surface — Development Plan

```yaml
date: 2026-06-11
author: Roro LeSage
model: Composer
sources:
  - documentation/planets/hexagonal-planet-specification.md
  - documentation/planets/planet-details-review.md
  - documentation/objects/star-system.md
  - documentation/stellar-system/development-plan.md
  - src/modules/planets/entities/planet.schema.ts
  - src/modules/planets/planets.service.ts
  - src/modules/planets/planets.controller.ts
  - src/shared/utils/procedural-generation.ts
```

---

## Overview

This plan tracks delivery of the **hexagonal planet surface** feature: **`Planet`** documents with nested **`PlanetSurface`** (toroidal hex grid) when a player enters a **landable** planet. Domain rules are defined in [hexagonal-planet-specification.md](./hexagonal-planet-specification.md). Gaps vs current code are summarized in [planet-details-review.md](./planet-details-review.md).

The live server still uses a **64×64 tile map** (`heightMap`, `tileMap`). This plan covers migration to the hex model and **upstream** changes to star-system planet generation (notably **`radius`**).

---

## Intended model (target)

| Rule | Description |
|------|-------------|
| **Planet summary** | Lightweight entry in `StarSystem.planets[]` — id, name, `x`, `y`, `radius`, `type`, `resources` |
| **Planet document** | MongoDB `planets` collection; `_id` = summary `id` (`{starId}_planet_{index}`) |
| **Inherited fields** | `_id`, `name`, `starSystemId`, `type`, `radius`, `resources` copied from summary — not re-rolled |
| **PlanetSurface** | Nested `Planet.surface` — `hexagons[]`, `generatedAt`; **`radius × radius`** cells |
| **Grid size** | **`radius`** (no separate `hexGridSize`); **odd integer from 5 to 15** |
| **Torus** | Axial `(q, r)` with `% radius` neighbor wrap (see spec `getNeighbors`) |
| **Planet entry** | Player enters from the **star-system view** — client already holds `StarSystem.planets[]` |
| **Type source of truth** | `type` (and all inherited fields) come from the matching **`StarSystem.planets[]`** entry — never re-rolled at detail generation |
| **Gas planets** | No `Planet` document; `type: 'gas'` read from summary; API rejects entry with **`422`** |
| **Landable types** | `rocky`, `ice`, `lava` (+ future types) |
| **Surface generation** | Created on **first player entry**, saved to MongoDB; **stable after save** (no regeneration) |
| **Generation seed** | Planet **`_id`** — no separate `seed` field |
| **Hex biomes (MVP)** | **Random** per cell — band-based assignment by `type` + distance deferred |
| **Hex resources (MVP)** | Every hex has `resources: []` — per-hex deposits deferred |
| **Summary resources** | Inherited `Planet.resources` from star-system summary only |
| **Orbital layout** | `x`, `y` on star-system summary only — not on `Planet` |
| **Entry API** | `GET /infinity/planets/:planetId?systemId={starId}` — **`systemId` required on first entry** |
| **`visited`** | **Not on `Planet`** — document existence means the planet was entered (`StarSystem.visited` unchanged) |

---

## Planet `radius` — odd integer 5–15 (required)

The hex grid edge length **N** equals summary **`radius`**. The grid needs a unique center cell at `(center, center)` with `center = (radius - 1) / 2`, so **`radius` must be an odd integer**.

| Policy | Value |
|--------|-------|
| **Minimum** | `5` (25 hex cells) |
| **Maximum** | `15` (225 hex cells) |
| **Valid values** | `5`, `7`, `9`, `11`, `13`, `15` |
| **Constants** | `PLANET_RADIUS_MIN`, `PLANET_RADIUS_MAX` in `game.constants.ts` |

| Context | Requirement |
|---------|----------------|
| Star-system generation | Random **odd integer** in **5–15** for every `planets[].radius` |
| Landable planets | Required — drives `PlanetSurface` size |
| Gas planets | No surface, but use the same rule for consistent summaries |
| Planet detail generation | **Do not** recompute radius — inherit from summary |

**Current code (misaligned):** `generateStarSystem` in `procedural-generation.ts` sets:

```typescript
radius: 5 + Math.random() * 10,  // fractional values, e.g. 11.4
```

**Target:** emit only odd integers from 5 to 15:

```typescript
// Odd values 5, 7, 9, 11, 13, 15
const radius = Math.floor(Math.random() * 6) * 2 + PLANET_RADIUS_MIN;
```

**Legacy invalid `radius`:** not applicable — MongoDB is empty. No fractional or even values exist in persisted star systems. Phase 1 fixes the generator; inherited `radius` is trusted on first entry.

Update [star-system.md](../objects/star-system.md) examples and [infinity-api.md](../infinity-api.md) when this lands.

---

## Current implementation

| Area | Status | Source |
|------|--------|--------|
| Planet schema | Hex model — `type`, `radius`, `surface.hexagons[]` | `planet.schema.ts` |
| Planet generation | `generatePlanetSurface({ seed, radius })` — toroidal hex grid | `planet-surface-generation.ts` |
| Star-system `radius` | Odd integer **5–15** via `rollOddPlanetRadius()` | `procedural-generation.ts` |
| Inherited summary fields | `_id`, `name`, `starSystemId`, `type`, `radius`, `resources` from summary | `planets.service.ts` |
| Summary lookup | `StarSystemService.getStarSystem` + `planets[].id` match | `planets.service.ts` |
| Gas handling | `422` on first entry; no `Planet` document | `planets.service.ts` |
| REST | `GET /infinity/planets/:planetId?systemId=` — `systemId` required on first entry | `planets.controller.ts` |
| Socket movement | `PLANET_JOIN` / `MOVE` with hex `(q, r)`; Redis positions | `socket` module |
| Hex / PlanetSurface | **Not implemented** | — |

---

## Migration phases

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| **0 — Documentation** | Docs | **Done** — [hexagonal-planet-specification.md](./hexagonal-planet-specification.md), [planet-details-review.md](./planet-details-review.md), this plan |
| **1 — Star-system `radius`** | Code + docs | **Done** — odd integer `radius` 5–15; constants + docs updated |
| **2 — Planet schema** | Code | **Done** — inherited fields + nested `surface`; tile-map fields removed |
| **3 — PlanetSurface generation** | Code | **Done** — `getNeighbors`, random biome + `dangerLevel`, `resources: []` |
| **4 — Gas exclusion** | Code + API | **Done** — `gas` → **422**; summary inheritance on first entry |
| **5 — API and docs** | Docs | **Done** — [infinity-api.md](../infinity-api.md) hex `Planet` response + error codes |
| **6 — Socket** | Code | **Done** — `PLANET_JOIN` / `LEAVE`; hex `(q, r)`; Redis position cache |
| **7 — Quality** | Tests | **Done** — unit + controller integration + e2e (`RUN_E2E=1`) |

Phases **0–7** are complete.

---

## Remaining work

| Priority | Work item | Phase | Notes |
|----------|-----------|-------|-------|
| ~~1~~ | ~~Force **odd integer** `planets[].radius` **5–15**~~ | ~~1~~ | **Done** |
| ~~2~~ | ~~Document `radius` constraint~~ | ~~1~~ | **Done** |
| ~~3~~ | ~~`Planet` schema — inherited + `surface`~~ | ~~2~~ | **Done** |
| ~~4~~ | ~~Remove legacy tile-map fields~~ | ~~2~~ | **Done** |
| ~~5~~ | ~~`PlanetsService` — inherit summary~~ | ~~3~~ | **Done** |
| ~~6~~ | ~~`PlanetSurface` generator~~ | ~~3~~ | **Done** — `planet-surface-generation.ts` |
| ~~7~~ | ~~Reject gas planets~~ | ~~4~~ | **Done** |
| ~~8~~ | ~~Update infinity-api.md~~ | ~~5~~ | **Done** |
| ~~9~~ | ~~Planet socket handlers~~ | ~~6~~ | **Done** — `socket.gateway.ts` + `PLANET_ERROR` |
| ~~10~~ | ~~Redis planet positions~~ | ~~6~~ | **Done** — `planet:position:{planetId}:{playerId}` |
| ~~11~~ | ~~Tests~~ | ~~7~~ | **Done** — see test files below |

---

## Planned test coverage

| Scope | Test case |
|-------|-----------|
| Unit | `generateStarSystem` — every `planets[].radius` is an **odd integer** |
| Unit | `generateStarSystem` — radius within configured min/max range |
| Unit | `getNeighbors` — toroidal wrap for `radius = 3` and `radius = 5` |
| Unit | `PlanetSurface` generation — produces **`radius × radius`** hexagons |
| Unit | `PlanetSurface` generation — every hex has **`resources: []`** |
| Unit | Gas planet — no `Planet` created; entry rejected |
| Unit | Landable planet — inherited `_id`, `name`, `type`, `radius`, `resources` match summary |
| Unit | Second `GET` — same document returned (no regeneration) |
| Integration | `GET /infinity/planets/:planetId?systemId={starId}` — happy path with `surface` |
| Integration | First entry without `systemId` — rejected (planet not in DB yet) |
| Integration | `GET ...?systemId={starId}` for gas summary — **422**; no `Planet` document |
| Integration | `GET ...?systemId={starId}` when summary id not found — **404** |
| Integration | Second `GET` without `systemId` — returns saved `Planet` (reload only) |
| Unit / integration | `PLANET_JOIN` — client joins room `planetId`; random spawn if no Redis position |
| Unit / integration | `PLANET_MOVE` — broadcasts `PLANET_UPDATE` with `(q, r)`; position written to Redis |

### Test files (Phase 7)

| File | Coverage |
|------|----------|
| `src/shared/utils/procedural-generation.spec.ts` | Star-system odd `radius` 5–15 |
| `src/shared/utils/planet-surface-generation.spec.ts` | `getNeighbors`, surface size, empty hex `resources` |
| `src/modules/planets/planets.service.spec.ts` | Summary inheritance, gas, reload, join/move + Redis |
| `src/modules/planets/planets.controller.spec.ts` | REST status codes **200** / **400** / **404** / **422** |
| `src/modules/socket/socket.gateway.spec.ts` | `PLANET_JOIN` / `LEAVE` / `MOVE` broadcasts |
| `test/e2e/planets.e2e-spec.ts` | Full REST + socket flow (`npm run test:e2e:docker`) |

---

## Phase 6 — socket and player position

Real-time movement on a planet surface uses Socket.IO after the client loads `Planet` + `surface` via REST.

### Events

| Direction | Event | Purpose |
|-----------|-------|---------|
| Client → Server | `PLANET_JOIN` | Join Socket.IO room named `planetId` |
| Client → Server | `PLANET_LEAVE` | Leave planet room |
| Client → Server | `PLANET_MOVE` | Player moved to hex `(q, r)` |
| Server → Client | `PLANET_UPDATE` | Broadcast `{ playerId, planetId, q, r }` to room `planetId` |

**Payload change:** replace tile `(x, y)` with axial hex **`(q, r)`** on `PLANET_MOVE` and `PLANET_UPDATE`.

### Movement rules (MVP)

| Rule | Phase 6 behavior |
|------|------------------|
| Bounds | **Not enforced** — all moves accepted for now |
| Neighbors only | **Not enforced** — any `(q, r)` allowed |
| Biome / danger | **Not enforced** — deferred |
| Torus | Client uses server `getNeighbors` for **display**; server does not block off-grid coords yet |

Validation (bounds, neighbor steps, blocked biomes) is added in a later iteration.

### Spawn position

On **`PLANET_JOIN`**, if the player has no cached position for that `planetId`, assign a **random** hex on the surface:

- Pick random `(q, r)` with `0 ≤ q, r < radius` (seeded/stable rules not required — new roll on each first join is fine).
- Write initial position to **Redis** before broadcasting to the room.
- If Redis already has a position for that player on that planet, **restore** it instead of re-rolling.

### Player position storage

| Store | Phase 6 | Later |
|-------|---------|-------|
| **Redis** | **Yes** — initial spawn on `PLANET_JOIN`; update on each `PLANET_MOVE` | — |
| **PostgreSQL** | No | Move durable player position from Redis to PostgreSQL when ready |

Use existing `RedisModule` / `RedisService` (same stack as cube cache). Exact key schema (e.g. `planet:position:{planetId}:{playerId}`) is defined at implementation.

`PlanetsService.handlePlayerMove` should update Redis instead of logging only.

---

## Dependencies

| Dependency | Owner | Notes |
|------------|-------|-------|
| Star-system planet summaries | [stellar-system/development-plan.md](../stellar-system/development-plan.md) | Phase 1 here requires star-system generator change |
| Star must exist before system | Star system phase 1 | Already done |
| Client hex rendering | Client | Must use server `getNeighbors` for torus |

---

## First entry — star-system context

Planet entry always originates from the **star-system view**. The client has already loaded `GET /infinity/galaxy/systems/:systemId` and holds `StarSystem.planets[]`. **`type`**, **`radius`**, **`resources`**, and **`name`** are defined on the matching summary entry — the detail generator **copies** them; it does not re-roll or infer `type` from `planetId` alone.

### First entry flow

1. Client calls `GET /infinity/planets/:planetId?systemId={starId}` where `planetId` matches `planets[].id` from the loaded star system.
2. If a **`Planet`** document already exists → return it ( **`systemId` optional** on reload).
3. If no document yet → **`systemId` is required**. Load `StarSystem` by `systemId`, find `planets[]` entry where `id === planetId`.
4. If star system or summary entry is missing → **404**.
5. If summary `type` is **`gas`** → **422**; do not create a **`Planet`** document.
6. If landable → copy inherited fields from the summary; generate **`PlanetSurface`**; save **`Planet`**.

| Case | `systemId` | Result |
|------|------------|--------|
| Reload (document exists) | Optional | **200** — saved `Planet` |
| First entry (landable) | **Required** | **200** — generate + save |
| First entry (`gas`) | **Required** | **422** — no document |
| First entry (no `systemId`) | Missing | **400** — cannot resolve summary |
| First entry (unknown id in summary) | Provided | **404** |

---

## Phase 2 — schema cleanup

Target `Planet` document (see [hexagonal-planet-specification.md](./hexagonal-planet-specification.md)) replaces the tile-map shape. Legacy fields are **removed**; no separate `visited` flag.

| Field | Decision |
|-------|----------|
| `heightMap`, `tileMap` | **Remove** — replaced by `surface.hexagons[]` |
| `seed` | **Remove** — use **`_id`** as the procedural generation seed |
| `biomeTypes` | **Remove** — biomes live on each hex in `surface.hexagons[].biome` only |
| `visited` | **Remove** — redundant (see below) |
| `type`, `radius` | **Add** — inherited from `StarSystem.planets[]` |
| `surface` | **Add** — `PlanetSurface`, created on first entry |

### What `visited` was (and why it goes away)

The **current** tile-map schema has `visited: boolean`, set to `true` when the server first creates the planet document. That duplicated a simpler rule you already use elsewhere:

| Object | `visited` meaning today |
|--------|-------------------------|
| **`StarSystem`** | Star system was generated or entered — **keep** this flag |
| **`Planet`** | Planet document was created — **redundant** |

In the hex model, **a `Planet` document only exists after a player enters a landable planet for the first time**. So “has the player entered this planet?” = “does a `Planet` document exist in MongoDB?” No extra `visited` field is needed on `Planet`.

---

## Phase 3 MVP — surface generation

### Hex resources

Per-hex resource deposits are **not** generated in the initial delivery. Each `Hexagon` still includes a `resources` array (per the spec interface), but the generator sets **`resources: []`** on every cell.

| Layer | Phase 3 behavior |
|-------|------------------|
| `Planet.resources` | Inherited from `StarSystem.planets[]` summary |
| `Hexagon.resources` | Always `[]` until biome → resource tables land |

Biome → resource lookup tables, extra-find algorithms, and alignment with `GET /infinity/resources/planet/:planetId` remain deferred.

### Hex biomes

Per-hex **`biome`** is assigned **randomly** in the initial delivery (seeded by planet **`_id`** for stable first-time generation). Band-based rules from the spec (planet `type` + distance from center) replace random assignment in a later iteration.

---

## Rollout — tile-map to hex (no migration)

MongoDB is **empty** today. Ship the hex model as a **breaking schema change** with **no migration script** and no dual-read compatibility layer.

| Assumption | Policy |
|------------|--------|
| Existing `Planet` documents | **None** — greenfield |
| Existing `StarSystem` documents | **None** — no legacy fractional/even `radius` values |
| Tile-map fields (`heightMap`, `tileMap`, …) | **Remove** in Phase 2 without migration |
| Old API clients | Must adopt hex `Planet` + `surface` response with server update |

If persisted tile-map or old star-system documents appear later (e.g. restored backup), delete or regenerate manually — out of scope for this delivery.

---

## Out of scope (for now)

- Per-hex resource generation (biome → resource tables, extra-find algorithms)
- Band-based biome assignment (planet `type` + distance from center)
- Separate resources collection alignment (`GET /infinity/resources/planet/:planetId`)
- Tile-map migration scripts or dual-read compatibility
- Planet move validation (bounds, neighbors-only, biome/danger blocking)
- Durable planet position in PostgreSQL (Redis only in Phase 6)

---

## Related documents

- [hexagonal-planet-specification.md](./hexagonal-planet-specification.md) — target domain spec
- [planet-details-review.md](./planet-details-review.md) — spec vs code review
- [planet.md](../objects/planet.md) — planet object (hex surface document)
- [star-system.md](../objects/star-system.md) — planet summaries and generation
- [stellar-system/development-plan.md](../stellar-system/development-plan.md) — star-system delivery plan
- [infinity-api.md](../infinity-api.md) — REST and Socket.IO reference
