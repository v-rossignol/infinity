# First Planet — Development Plan

```yaml
date: 2026-06-11
author: Roro LeSage
model: Composer
sources:
  - documentation/first-planet/first-planet-specifications.md
  - documentation/TO-BE-FIXED.md
  - src/shared/utils/spawn-selection.ts
  - src/shared/utils/spawn-cube-selection.ts
  - src/modules/players/player-spawn.service.ts
  - src/modules/players/players.service.ts
  - src/modules/players/entities/player.entity.ts
  - src/modules/galaxy/cube.service.ts
  - src/modules/galaxy/star-system.service.ts
  - src/modules/planets/planets.service.ts
  - src/shared/constants/galaxy.constants.ts
  - src/shared/utils/coordinates.ts
  - documentation/stellar-gate-api.md
  - documentation/infinity-api.md
```

## Overview

This plan tracks delivery of **first-planet spawn**: when a player enters the game from **StellarGate** for the first time, the server allocates a new adjacent cube, picks a star and rocky planet, materializes the planet surface, and returns a ready-to-play state via **`POST /infinity/players/me/enter-game`**.

Domain rules and selection algorithms are defined in [first-planet-specifications.md](./first-planet-specifications.md). Deferred work (StellarGate cookie auth, partial-failure resume) is tracked in [TO-BE-FIXED.md](../TO-BE-FIXED.md).

**Status:** specification complete — **implementation not started**.

---

## Intended model (target)

| Rule | Description |
|------|-------------|
| Trigger | `POST /infinity/players/me/enter-game` (JWT); idempotent when `Player.currentPlanetId` is set |
| Player row | Create `Player` for `userId` on first `enter-game` if missing |
| Seed cube | On empty galaxy, create cube at `(0, 0, 0)` with stars; **never** a spawn target |
| Spawn cube | Random existing cube → random axis → random `±` → first empty slot along ray; exclude `(0, 0, 0)` |
| Star | Uniform random from `CubeWithStars.stars[]` in spawn cube |
| Planet | Largest `radius` among `type === 'rocky'`; tie → first in `planets[]` |
| Planet document | `PlanetsService.getPlanet(planetId, starId)` — existing first-entry path |
| Surface position | `PlanetsService.joinPlanet(playerId, planetId)` — random `(q, r)` in Redis |
| Player persistence | Global star coords (`localToGlobal`), `currentPlanetId`, `planetX`/`planetY` ← `q`/`r`; **write last** |
| Retries | Caps in `spawn.constants.ts` — see spec §1.5; `503` after `SPAWN_FULL_ATTEMPTS` |
| Auth (MVP) | Bearer JWT via `JwtAuthGuard`; cookie `infinity_token` deferred — [TO-BE-FIXED.md](../TO-BE-FIXED.md) §1 |
| Client flow | Auth → `enter-game` → render response → `PLANET_JOIN` restores Redis position |

---

## Current implementation

| Area | Status | Source |
|------|--------|--------|
| Cube get-or-create | **Done** — `getOrCreateByOrigin` | `cube.service.ts` |
| Star system get-or-create | **Done** — `getStarSystem` | `star-system.service.ts` |
| Planet first entry | **Done** — summary inheritance + surface | `planets.service.ts` |
| Surface join / Redis | **Done** — `joinPlanet` | `planets.service.ts` |
| Player CRUD | **Partial** — `createForUser` at `(0,0,0)`, no spawn | `players.service.ts` |
| Cube spawn selection | **Done** — `hasAnyCube`, `findRandom`, `existsByOrigin`, `pickSpawnCubeOrigin` | `cube.service.ts`, `spawn-cube-selection.ts` |
| Spawn constants | **Done** | `spawn.constants.ts` |
| Selection helpers | **Done** — `pickSpawnCubeOrigin`, `pickRandomStar`, `pickLargestRockyPlanet` | `spawn-cube-selection.ts`, `spawn-selection.ts` |
| Orchestrator | **Done** — `PlayerSpawnService.bootstrapPlayer()` | `player-spawn.service.ts` |
| Enter-game endpoint | **Done** — `POST /infinity/players/me/enter-game` (JWT) | `players.controller.ts` |
| Module wiring | **Done** — `PlayersModule` imports `GalaxyModule`, `PlanetsModule` | `players.module.ts` |
| API docs | **Done** — `infinity-api.md` `POST /players/me/enter-game` | — |
| StellarGate cookie auth | **Deferred** — [TO-BE-FIXED.md](../TO-BE-FIXED.md) §1 | `auth` module |

### Flow (target)

1. Client calls `POST /infinity/players/me/enter-game` with JWT.
2. Resolve or create `Player`; if `currentPlanetId` set → return existing spawn context.
3. `pickSpawnCubeOrigin()` (bootstrap seed if needed) → `getOrCreateByOrigin`.
4. `pickRandomStar` → `getStarSystem` → `pickLargestRockyPlanet`.
5. `getPlanet` → `joinPlanet` → `updatePosition` (persist `Player` **last**).
6. Return `{ player, cube, star, starSystemId, planet, surfacePosition }`.

---

## Migration phases

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| **0 — Documentation** | Docs | **Done** — [first-planet-specifications.md](./first-planet-specifications.md), this plan |
| **1 — Cube selection** | Code | **Done** — `spawn.constants.ts`; `CubeService` methods; `pickSpawnCubeOrigin` + seed bootstrap + `(0,0,0)` exclusion |
| **2 — Selection helpers** | Code | **Done** — `pickRandomStar`, `pickLargestRockyPlanet` in `spawn-selection.ts` |
| **3 — Orchestrator** | Code | **Done** — `PlayerSpawnService.bootstrapPlayer()` with retry loops per spec §1.5 / §3.3 |
| **4 — API** | Code | **Done** — `POST /infinity/players/me/enter-game`; `JwtAuthGuard`; create player if missing |
| **5 — API docs** | Docs | **Done** — `infinity-api.md` — request, response, errors (`503`) |
| **6 — Quality** | Tests | **Done** — unit + `test/e2e/first-planet.e2e-spec.ts` (`RUN_E2E=1`) |

Phases **0–6** complete.

---

## Remaining work

| Priority | Work item | Phase | Notes |
|----------|-----------|-------|-------|
| 1 | `spawn.constants.ts` (`SPAWN_CUBE_SCAN_STEPS`, etc.) | 1 | **Done** |
| 2 | `CubeService.hasAnyCube()` | 1 | **Done** |
| 3 | `CubeService.findRandom()` | 1 | **Done** — MongoDB `$sample` |
| 4 | `CubeService.existsByOrigin()` | 1 | **Done** — MongoDB only |
| 5 | `pickSpawnCubeOrigin()` | 1 | **Done** — seed bootstrap + `(0,0,0)` exclusion |
| 6 | `pickRandomStar` / `pickLargestRockyPlanet` | 2 | **Done** |
| 7 | `PlayerSpawnService` | 3 | **Done** |
| 8 | `POST /players/me/enter-game` | 4 | **Done** — `req.user.id` from JWT payload `sub` |
| 9 | `PlayersModule` wiring | 3 | **Done** |
| 10 | `infinity-api.md` | 5 | **Done** |
| 11 | Unit tests — spawn selection | 6 | **Done** — `spawn-cube-selection.spec.ts`, `spawn-selection.spec.ts` |
| 12 | Unit tests — orchestrator | 6 | **Done** — `player-spawn.service.spec.ts`, `players.controller.spec.ts` |
| 13 | E2E — enter-game | 6 | **Done** — `test/e2e/first-planet.e2e-spec.ts` |

### Planned test coverage

| Scope | Test case |
|-------|-----------|
| Unit | `pickSpawnCubeOrigin` — empty galaxy seeds `(0,0,0)`, returns adjacent origin |
| Unit | `pickSpawnCubeOrigin` — never returns `(0, 0, 0)` |
| Unit | `pickSpawnCubeOrigin` — skips occupied slots along ray |
| Unit | `pickRandomStar` — uniform index; throws on empty array |
| Unit | `pickLargestRockyPlanet` — max radius; tie-break by array order; throws if no rocky |
| Unit | `bootstrapPlayer` — idempotent when `currentPlanetId` set |
| Unit | `bootstrapPlayer` — retries another star when no rocky planet |
| Unit | `bootstrapPlayer` — `updatePosition` called after `getPlanet` and `joinPlanet` |
| Integration | `POST /infinity/players/me/enter-game` — `201`/`200` + spawn payload shape |
| Integration | Second call — same `currentPlanetId`, no new cube |
| Integration | `401` without JWT |
| E2E | Register/login (Bearer) → enter-game → planet document exists |

---

## Dependencies

| Dependency | Owner | Notes |
|------------|-------|-------|
| Cube + star generation | [galaxy/development-plan.md](../galaxy/development-plan.md) | Phase 2–3 complete |
| Star system | [stellar-system/development-plan.md](../stellar-system/development-plan.md) | Get-or-create on star id |
| Planet surface | [planets/development-plan.md](../planets/development-plan.md) | Phases 0–7 complete |
| StellarGate cookie auth | [TO-BE-FIXED.md](../TO-BE-FIXED.md) §1 | Parallel — not blocking spawn code or Bearer tests |

---

## Out of scope (for now)

- StellarGate cookie auth and `GET /auth/me` — [TO-BE-FIXED.md](../TO-BE-FIXED.md) §1
- Resume in-progress spawn on partial failure — [TO-BE-FIXED.md](../TO-BE-FIXED.md) §2
- Renaming `Player.planetX` / `planetY` to `planetQ` / `planetR`
- Spawning on `ice` or `lava` planets
- Socket changes — reuse existing `PLANET_JOIN` after REST spawn
- New procedural generators — reuse `getOrCreateByOrigin`, `getStarSystem`, `getPlanet`

---

## Related documents

| Document | Relevance |
|----------|-----------|
| [first-planet-specifications.md](./first-planet-specifications.md) | Full spawn specification |
| [TO-BE-FIXED.md](../TO-BE-FIXED.md) | Deferred auth and partial-failure items |
| [stellar-gate-api.md](../stellar-gate-api.md) | Client auth contract |
| [infinity-api.md](../infinity-api.md) | HTTP surface to update in phase 5 |
| [planets/development-plan.md](../planets/development-plan.md) | Planet first-entry and socket rules |
| [stellar-system/development-plan.md](../stellar-system/development-plan.md) | Star system get-or-create |
| [objects/cube.md](../objects/cube.md) | Cube grid and generation |
| [objects/planet.md](../objects/planet.md) | Planet document lifecycle |
