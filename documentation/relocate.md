# Player Relocate — Specification

```yaml
date: 2026-06-15
author: Roro LeSage
model: Composer
sources:
  - src/modules/players/player-location.controller.ts
  - src/modules/players/player-location.service.ts
  - src/shared/interfaces/player-location.interface.ts
  - src/shared/utils/planet-id.ts
  - contracts/game-api.yaml
  - documentation/objects/cube.md
  - documentation/objects/star-system.md
  - documentation/objects/planet.md
```

## Overview

This document tracks the **relocate** feature: teleporting a player to a target at **cube**, **star-system**, or **planet** depth.

A dedicated `POST /infinity/players/me/relocate` route is **not implemented yet**.

**MVP rule (implemented):** on the existing `POST /infinity/players/me/location/enter-planet` route, **admin users** (`User.role === 'admin'`, carried in the JWT) may relocate to any planet **without depth restrictions**. Regular players keep the stepwise transition rules.

---

## Implemented — admin relocate via `enter-planet`

### Route

`POST /infinity/players/me/location/enter-planet`

### Request body (unchanged)

```json
{
  "planetId": "550e8400-e29b-41d4-a716-446655440000_planet_0",
  "q": 0,
  "r": 0
}
```

### Permission model

| Caller | Behaviour |
|--------|-----------|
| **Admin** (`role: admin`) | **No depth restriction.** Player may be at cube depth, planet depth, `location: null`, etc. Server resolves `cube.id` and `starSystem.id` from the target planet and persists planet-depth location. |
| **Regular player** | Must be at **star-system depth**; otherwise **409 Conflict** (unchanged). |

Admin detection uses `req.user.role` from `JwtStrategy` (same source as `AdminGuard`).

### World validation (admin path only)

Even for admins, “no restriction” means **no depth / transition rules**, not “ignore the world”:

| Check | HTTP code |
|-------|-----------|
| Invalid `planetId` format (`{starId}_planet_{index}`) | **400** |
| Parent star not found | **404** |
| Planet not in star-system summary | **404** |
| Gas planet (no enterable surface) | **422** |
| Invalid `q` / `r` (non-negative integers) | **400** |

Resolution flow:

1. Parse `starSystemId` from `planetId` via `parseStarSystemIdFromPlanetId()` ([`planet-id.ts`](../src/shared/utils/planet-id.ts)).
2. Load star → `cube_id`.
3. Load star system (lazy-generate if star exists).
4. Find planet summary; reject gas planets.
5. `buildPlanetLocation()` + persist.

### Response (unchanged)

```json
{ "player": { "id": "…", "location": { … } } }
```

### Implementation

| File | Change |
|------|--------|
| [`player-location.controller.ts`](../src/modules/players/player-location.controller.ts) | Pass `{ adminBypass: req.user.role === 'admin' }` to `transitionTo` |
| [`player-location.service.ts`](../src/modules/players/player-location.service.ts) | `adminRelocateToPlanet()` branch; injects `StarService`, `StarSystemService` |
| [`planet-id.ts`](../src/shared/utils/planet-id.ts) | Parse star id from procedural planet id |

OpenAPI: [contracts/game-api.yaml](../../contracts/game-api.yaml) — `enter-planet` description updated.

---

## Future — dedicated `POST /me/relocate`

**Proposed route:** `POST /infinity/players/me/relocate`

**Intent:** Single endpoint accepting a discriminated target (`cube` | `starSystem` | `planet`). Return the resolved world entity plus updated player.

**Status:** Not implemented. Extend the admin bypass pattern to cube and star-system depths when needed.

### Open decisions (relocate-only)

#### Request body shape

Discriminated union by `depth` — see prior draft for planet / star-system / cube variants.

**TBD:** Final JSON Schema (`RelocateDto`).

#### Non-admin permission rules

When `relocate` ships for regular players:

| Rule | Description |
|------|-------------|
| **Visited-only** | Target must already exist or have been visited |
| **Proximity** | Only within current cube or N LY |
| **Ownership** | Only controlled planets/systems |
| **Game cost** | Fuel, cooldown, items |

Until defined, non-admin callers would receive **403** on a dedicated relocate route.

#### Response shape

| Option | Example |
|--------|---------|
| World entity only | `{ "planet": { … } }` |
| World + player | `{ "player": { … }, "planet": { … } }` |

**TBD:** Align with GET DTOs for planets, star systems, cubes.

#### Side effects

| Effect | Question |
|--------|----------|
| Socket.IO rooms | Auto leave/join on relocate? |
| `StarSystem.visited` | Set when relocating to system? |
| Planet surface generation | On relocate vs require prior GET? |

---

## Current location API (context)

| Endpoint | Behaviour |
|----------|-----------|
| `POST …/location/enter-system` | Cube → star system (one step) |
| `POST …/location/enter-planet` | Star system → planet; **admin bypass** (this doc) |
| `POST …/location/leave-planet` | Planet → star system |
| `POST …/location/leave-system` | Star system → cube |
| `PATCH …/location` | Replace full `location` JSON — no world validation |
| `POST …/players/me/enter-game` | First-time spawn (random rocky planet) |

---

## Implementation checklist (`relocate` endpoint)

- [ ] DTO + `class-validator` in `src/modules/players/dto/`
- [ ] Service method (extend `PlayerLocationService` or dedicated service)
- [ ] Controller route
- [ ] JSON Schema under [contracts/schemas/](../../contracts/schemas/)
- [ ] OpenAPI entry in [contracts/game-api.yaml](../../contracts/game-api.yaml)
- [ ] Unit + E2E tests
- [ ] Update [AGENTS.md](../AGENTS.md) REST table

**Done for admin planet relocate:**

- [x] Admin bypass on `enter-planet`
- [x] World validation (star, planet summary, gas rejection)
- [x] `planet-id` parser utility
- [x] Unit tests (service + controller)
- [x] OpenAPI description for `enter-planet`

---

## Related documents

| Document | Relevance |
|----------|-----------|
| [objects/cube.md](./objects/cube.md) | Cube identity |
| [objects/star-system.md](./objects/star-system.md) | Star system generation |
| [objects/planet.md](./objects/planet.md) | Planet surface / hex grid |
| [contracts/game-api.yaml](../../contracts/game-api.yaml) | REST contract |
| [TO-BE-FIXED.md](./TO-BE-FIXED.md) | Deferred server issues |
