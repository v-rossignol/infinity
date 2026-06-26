# Player Location — Development Plan

```yaml
date: 2026-06-13
author: Roro LeSage
model: Composer
sources:
  - documentation/wip/player-location/player-location.md
  - documentation/wip/player-location/example.json
  - documentation/first-planet/first-planet-specifications.md
  - documentation/first-planet/development-plan.md
  - documentation/infinity-api.md
  - documentation/TO-BE-FIXED.md
  - src/modules/players/entities/player.entity.ts
  - src/modules/players/players.service.ts
  - src/modules/players/player-spawn.service.ts
  - src/modules/planets/planets.service.ts
  - src/modules/socket/socket.gateway.ts
  - src/shared/interfaces/player.interface.ts
```

## Overview

This plan implements the **contextual player location** model defined in [player-location.md](./player-location.md): nested `location` by view depth, **freshy** when `location` is `NULL`, **JSONB** in PostgreSQL, **flush on every move**, **no Redis** for position.

**Goal:** Replace flat `Player` columns (`galaxyX`, `galaxyY`, `galaxyZ`, `currentPlanetId`, `planetX`, `planetY`) and planet Redis keys with a single `Player.location` JSONB column. All spawn, REST, and Socket.IO position paths read and write that column.

**Status:** **Complete** (phases 0–7, 2026-06-13). Contextual `Player.location` is implemented end-to-end.

**Prerequisite:** [first-planet/development-plan.md](../first-planet/development-plan.md) phases 0–6 are **done** (enter-game spawn exists). This plan **refactors** that delivery onto the new location shape.

---

## Target model (summary)

| Rule | Description |
|------|-------------|
| Freshy | `Player.location IS NULL` — authenticated, not in world |
| Storage | PostgreSQL **`JSONB`** only — no Redis for location |
| Writes | **Flush on every move** — spawn, transitions, `GALAXY_MOVE`, `PLANET_MOVE`, system moves |
| Depth | Coordinates only at deepest active level; `cube.id` always present when `cube` exists |
| Cube coords | **Local 3D** inside cube volume `[0, 10)` LY per axis |
| Spawn | First `enter-game` sets **planet depth** (existing first-planet flow) |
| API shape | Matches [example.json](./example.json) |

Full rules: [player-location.md](./player-location.md).

---

## Current implementation

| Area | Status | Notes |
|------|--------|-------|
| `Player.location` JSONB | **Done** | Single column; flat columns removed |
| Freshy | **Done** | `location === null`; `createForUser` creates freshy only |
| Enter-game spawn | **Done** | Planet-depth `location`; slim `{ player }` response |
| Planet socket path | **Done** | JWT → `Player.id`; PostgreSQL flush on join/move |
| View transitions | **Done** | REST under `/players/me/location/*` |
| Cube/system moves | **Done** | `GALAXY_MOVE`, `SYSTEM_MOVE`, PATCH cube/system |
| REST location API | **Done** | `PATCH /players/me/location`; legacy `PATCH .../position` removed |
| Redis planet position | **Removed** | Cube cache only |
| Tests | **Done** | Unit + e2e (phase 7) |

---

## Decisions

| # | Topic | Decision | Rationale |
|---|--------|----------|-----------|
| **D1** | Storage | **JSONB `Player.location`** | Matches nested depth-dependent API shape |
| **D2** | Redis | **Remove** planet position keys in this delivery | Single source of truth; simpler reconnect |
| **D3** | Move persistence | **Flush PostgreSQL on every move** | No debounce, no separate hot cache |
| **D4** | Freshy | **`location === null`** | Replaces `currentPlanetId === null` |
| **D5** | Flat columns | **Drop** after migration | Remove `galaxyX/Y/Z`, `currentPlanetId`, `planetX/Y` in same change set |
| **D6** | `createForUser` | **`location: null` only** | No default galaxy `(0,0,0)` — new players are freshies |
| **D7** | Spawn idempotency | **`location != null`** → return existing context | Same as today's `currentPlanetId` check |
| **D8** | `joinPlanet` | **Read hex from `Player.location`** | No Redis fallback; roll random only when planet depth missing or wrong planet |
| **D9** | Socket identity | **JWT on connect** — authenticate handshake (cookie `infinity_token` and/or Bearer); attach **`Player.id`** to socket (`client.data.playerId`) | Location is per player, not per socket session; in scope for phase 4 |
| **D10** | View transitions | **Phase 5** — REST endpoints first; sockets optional | Solaris / Galaxy clients not scaffolded |
| **D11** | Dev database | **Wipe** — no migration script for existing flat columns | Acceptable for local dev; restart with empty PostgreSQL after schema change |
| **D12** | Enter-game response | **Slim payload** — return `{ player }` with `location` only | **`planet.id`** (inside `location`) is enough for Terra View to bootstrap; client loads planet surface, system, cube via existing REST as needed. Remove expanded spawn envelope (`cube`, `star`, `planet` document, `surfacePosition`, …) |

**Go/no-go:** **Proceed.** D1–D12 locked (2026-06-13).

---

## Migration phases

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| **0 — Types & validation** | Code | **Done** — `PlayerLocation` interfaces, depth helpers, invariant validator |
| **1 — Schema** | Code | **Done** — JSONB `location`; flat columns removed; freshy defaults |
| **2 — Location service** | Code | **Done** — `PlayerLocationService` — get/set/patch/transitions |
| **3 — Spawn alignment** | Code | **Done** — slim `{ player }` enter-game; `PlayerLocationService.setLocation` on spawn |
| **4 — Planet socket path** | Code | **Done** — Socket JWT auth + JSONB flush; Redis removed from `PlanetsService` |
| **5 — View transitions & cube/system moves** | Code | **Done** — Transition API; `GALAXY_MOVE` / `SYSTEM_MOVE` persistence |
| **6 — REST cleanup** | Code + docs | **Done** — `PATCH /players/me/location`; `infinity-api.md` updated |
| **7 — Quality** | Tests | **Done** — Unit + e2e; legacy flat-field / Redis tests removed |

Phases **0–4** are the **MVP** (spawn + planet gameplay). Phases **5–7** complete navigation and documentation.

---

## Phase 0 — Types & validation

**Files:** `src/shared/interfaces/player-location.interface.ts` (new), optional `src/shared/utils/player-location.ts` (helpers).

| Task | Detail |
|------|--------|
| `PlayerLocation` types | Discriminated union or nested types for cube / starSystem / planet depths |
| `isFreshy(player)` | `location == null` |
| `getLocationDepth(location)` | `'cube' \| 'starSystem' \| 'planet'` |
| `assertValidLocation(location)` | Enforce invariants from [player-location.md § Invariants](./player-location.md#invariants) |
| `buildPlanetLocation(...)` | Factory from cube id, star id, planet id, hex — used by spawn |
| Unit tests | Valid/invalid payloads; each depth shape; freshy |

---

## Phase 1 — Schema

**Files:** `player.entity.ts`, `player.interface.ts`, TypeORM sync (dev) or migration script.

| Task | Detail |
|------|--------|
| Add `location` column | `type: 'jsonb'`, `nullable: true`, default `null` |
| Remove flat columns | `galaxyX`, `galaxyY`, `galaxyZ`, `currentPlanetId`, `planetX`, `planetY` |
| `createForUser` | Create `{ userId }` only — `location` stays `null` (D6) |
| Dev data | **Wipe dev PostgreSQL** after schema change (D11) — drop and recreate `player` table or reset DB before first run with this schema |

**Note:** `synchronize: true` in dev applies schema on restart. Production migrations out of scope for now per project conventions.

---

## Phase 2 — Location service

**Files:** `player-location.service.ts` (new), `players.module.ts`, `players.service.ts`.

| Task | Detail |
|------|--------|
| `getLocation(playerId)` | Return `PlayerLocation \| null` |
| `setLocation(playerId, location)` | Full replace; validate invariants |
| `updateCubePosition(playerId, position)` | Patch `cube.position` — player must be at cube depth |
| `updateStarSystemPosition(playerId, position)` | Patch `starSystem.position` |
| `updatePlanetHex(playerId, hex_coords)` | Patch `planet.hex_coords` |
| `transitionTo(...)` | Apply view-transition rules (clear parent coords, set new depth) |
| Errors | `400` invalid shape; `409` depth mismatch |

Wire `PlayersService.updatePosition` → deprecate or delegate to `PlayerLocationService`.

---

## Phase 3 — Spawn alignment

**Files:** `player-spawn.service.ts`, `players.controller.ts`, spawn specs, `first-planet.e2e-spec.ts`.

| Task | Detail |
|------|--------|
| Freshy check | `if (player.location) return existing player` (D7) — no world re-fetch in response |
| `allocateNewSpawn` | After planet + hex known, `setLocation` **planet depth**: `{ cube: { id }, starSystem: { id }, planet: { id, hex_coords } }` |
| Coords source | Hex from random roll (same as today); cube/star ids from spawn allocation |
| Remove | `localToGlobal` → flat galaxy write; `updatePosition` flat fields; **`SpawnResult` expanded fields** |
| Slim response (D12) | `enter-game` returns `{ player: { id, userId, location, … } }` — Terra View uses `location.planet.id` + `GET /planets/:planetId` |
| Drop | `SpawnResult` fields: `cube`, `star`, `starSystemId`, `planet`, `surfacePosition` |

**Write order (unchanged intent):** world objects first, **`location` persist last**.

---

## Phase 4 — Planet socket path

**Files:** `planets.service.ts`, `socket.gateway.ts`, `socket.module.ts`, JWT/socket auth helper (new), `planet.constants.ts`, specs.

| Task | Detail |
|------|--------|
| Socket auth (D9) | On connection: validate JWT (cookie or handshake `auth.token`); resolve `User` → `Player`; set `client.data.playerId`; reject unauthenticated planet/galaxy move handlers |
| `joinPlanet` | Use `client.data.playerId`; load hex from `Player.location` when planet depth matches; else roll random + `setLocation` |
| `handlePlayerMove` | Use `client.data.playerId`; `updatePlanetHex` → PostgreSQL flush (D3); broadcast `PLANET_UPDATE` with **real** `playerId` |
| Remove Redis | Delete `getCachedPosition`, `savePosition`, `getPlanetPositionRedisKey` usage |
| `PlanetsService` deps | Drop `RedisService` if no other planet Redis use |
| E2E | Update `planets.e2e-spec.ts` — authenticated socket + assert PG location after `PLANET_MOVE` |

---

## Phase 5 — View transitions & cube/system moves

**Files:** `players.controller.ts` or new `player-location.controller.ts`, `galaxy.service.ts`, `socket.gateway.ts`.

| Task | Detail |
|------|--------|
| REST transitions | e.g. `POST /players/me/location/enter-system`, `enter-planet`, `leave-planet`, `leave-system` — or single `PATCH /players/me/location` with transition intent |
| Cube → system | Set `starSystem.id` + `position`; drop `cube.position` |
| System → planet | Set `planet` + `hex_coords`; drop `starSystem.position` |
| Reverse transitions | Per [player-location.md § View transitions](./player-location.md#view-transitions) |
| `GALAXY_MOVE` | Resolve player from auth; `updateCubePosition`; broadcast `GALAXY_UPDATE` |
| System move | Handler TBD (socket or REST) — `updateStarSystemPosition` |

**Defer** if Galaxy View / Solaris clients are not ready — service methods + REST suffice for manual/e2e testing.

---

## Phase 6 — REST cleanup & docs

**Files:** `infinity-api.md`, `update-position.dto.ts`, `players.controller.ts`, `documentation/first-planet/first-planet-specifications.md` (player position storage section), [TO-BE-FIXED.md](../TO-BE-FIXED.md).

| Task | Detail |
|------|--------|
| Remove or replace | `PATCH /infinity/players/:playerId/position` — prefer authenticated `PATCH /players/me/location` |
| `GET /players/:userId` | Return `location` in player object; freshy when `null` |
| Document freshy | Clients: if `location == null` → enter-game |
| Update [player-location.md](./player-location.md) | Mark storage section **implemented** when done |
| Cross-link | Note in [first-planet/development-plan.md](../first-planet/development-plan.md) that persistence model superseded by this plan |

---

## Phase 7 — Quality

| Scope | Test case |
|-------|-----------|
| Unit | `assertValidLocation` — rejects partial trees, parent coords at wrong depth |
| Unit | `transitionTo` — each transition clears/sets correct fields |
| Unit | `bootstrapPlayer` — freshy → planet depth `location`; idempotent when `location` set |
| Unit | `joinPlanet` — reads hex from JSONB; no Redis calls |
| Unit | `handlePlayerMove` — updates JSONB every call |
| Integration | `enter-game` — `{ player.location }` only; planet-depth shape with `planet.id` |
| Integration | Repeat enter-game — same `location`; no cube/star/planet in body |
| Integration | `PLANET_MOVE` — hex in DB matches broadcast payload |
| E2E | Migrate `first-planet.e2e-spec.ts`, `planets.e2e-spec.ts` off flat fields / Redis |
| Regression | `npm test` + `RUN_E2E=1 npm run test:e2e` |

---

## File touch list (expected)

| File | Phases |
|------|--------|
| `src/shared/interfaces/player-location.interface.ts` | 0 |
| `src/shared/utils/player-location.ts` | 0 |
| `src/modules/players/entities/player.entity.ts` | 1 |
| `src/shared/interfaces/player.interface.ts` | 1 |
| `src/modules/players/player-location.service.ts` | 2 |
| `src/modules/players/players.service.ts` | 2, 6 |
| `src/modules/players/player-spawn.service.ts` | 3 |
| `src/modules/players/players.controller.ts` | 3, 5, 6 |
| `src/modules/players/dto/update-location.dto.ts` | 6 |
| `src/modules/planets/planets.service.ts` | 4 |
| `src/modules/galaxy/galaxy.service.ts` | 5 |
| `src/modules/socket/socket.gateway.ts` | 4, 5 |
| `src/modules/socket/socket.module.ts` | 4 |
| `src/modules/socket/socket-auth.ts` (or similar) | 4 |
| `src/shared/constants/planet.constants.ts` | 4 |
| `documentation/infinity-api.md` | 6 |
| `test/e2e/first-planet.e2e-spec.ts` | 7 |
| `test/e2e/planets.e2e-spec.ts` | 7 |

---

## Dependencies

| Dependency | Owner | Notes |
|------------|-------|-------|
| First-planet spawn | [first-planet/development-plan.md](../first-planet/development-plan.md) | **Done** — refactor target |
| Planet surface + sockets | [planets/development-plan.md](../planets/development-plan.md) | **Done** — Redis path removed here |
| Galaxy cube local coords | [objects/cube.md](../objects/cube.md), [objects/star.md](../objects/star.md) | Local space definition |
| Auth (enter-game JWT) | [auth-alignment-development-plan.md](../auth-alignment-development-plan.md) | **Done** — Bearer + cookie |

---

## Out of scope (for now)

- Redis reintroduction for hot multiplayer cache
- Galaxy View / Solaris / Terra View client wiring
- Production TypeORM migrations (dev **wipe** per D11)
- Partial-failure spawn resume — [TO-BE-FIXED.md](../TO-BE-FIXED.md) §2
- Admin dashboards showing player location map
- `spawnPending` / production legacy data migration

---

## Related documents

| Document | Relevance |
|----------|-----------|
| [player-location.md](./player-location.md) | Canonical location specification |
| [example.json](./example.json) | Payload examples (`freshy`, three depths) |
| [first-planet-specifications.md](../first-planet/first-planet-specifications.md) | Spawn flow — update storage section after phase 3 |
| [first-planet/development-plan.md](../first-planet/development-plan.md) | Prior spawn delivery |
| [infinity-api.md](../infinity-api.md) | REST + Socket.IO docs to update |
| [TO-BE-FIXED.md](../TO-BE-FIXED.md) | Track client alignment and deferred items |
| [objects/planet.md](../objects/planet.md) | Hex coordinate space |
