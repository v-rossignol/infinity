# Galaxy Phase 1 — Core Infrastructure

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
version: 1.0.0
sources:
  - documentation/galaxy/development-plan.md (Phase 1)
  - documentation/galaxy/cube-based-star-system.md
  - documentation/galaxy/cube-naming-specification.md
  - src/modules/galaxy/entities/cube.schema.ts
  - src/modules/galaxy/entities/star.schema.ts
  - src/shared/utils/coordinates.ts
  - src/shared/utils/cube-naming.ts
```

## Scope

Phase 1 delivers the **foundational data layer and utilities** for the cube-based galaxy model. It does **not** include procedural generation, REST endpoints, Redis caching, or Socket.IO integration (Phases 2–5).

The legacy `StarSystem` model remains registered and unchanged.

---

## Implemented Components

| Area | Location |
|------|----------|
| Constants | `src/shared/constants/galaxy.constants.ts` |
| TypeScript interfaces | `src/shared/interfaces/galaxy.interface.ts` |
| Coordinate utilities | `src/shared/utils/coordinates.ts` |
| Cube naming (CRC32 + Base36) | `src/shared/utils/cube-naming.ts` |
| Public barrel export | `src/shared/utils/galaxy.ts` |
| MongoDB `Cube` schema | `src/modules/galaxy/entities/cube.schema.ts` |
| MongoDB `Star` schema | `src/modules/galaxy/entities/star.schema.ts` |
| Module registration | `src/modules/galaxy/galaxy.module.ts` |
| Unit tests | `src/shared/utils/coordinates.spec.ts`, `cube-naming.spec.ts` |

---

## Data Models

### Cube (`cubes` collection)

| Field | Type | Notes |
|-------|------|-------|
| `_id` | UUID string | Primary key (UUID v4, assigned during generation — Phase 2) |
| `name` | string | Deterministic CRC32 + Base36 hash of `origin` |
| `origin` | `{ x, y, z }` | Cube **center** in light-years |
| `star_ids` | string[] | References to star `_id` values; stars collection is source of truth |

**Indexes:** unique on `_id`, unique on `name`, unique compound on `(origin.x, origin.y, origin.z)`.

### Star (`stars` collection)

| Field | Type | Notes |
|-------|------|-------|
| `_id` | string | e.g. `"Alpha kikyhk"` (Greek letter + cube `name`) |
| `local_coords` | `{ x, y, z }` | Relative to cube minimum corner; each axis in `[0, 10)` |
| `cube_id` | UUID string | Parent cube `_id` |
| `properties.type` | enum | `yellow` \| `red` \| `blue` \| `white` |

**Indexes:** unique on `_id`, index on `cube_id`.

---

## Coordinate System

- Cube edge: **10 LY**; half-edge: **5 LY**.
- Reference cube center: **`(0, 0, 0)`**.
- Cube extent per axis: **`[center − 5, center + 5)`**.
- Minimum corner: `origin − 5` per axis.
- **Local → global:** `global = min_corner + local`
- **Global → local:** `local = global − min_corner`
- **Resolve center from global:** `center = floor((global + 5) / 10) × 10` per axis.

---

## Cube Naming

Algorithm (IEEE CRC32, unsigned, lowercase Base36):

1. Format origin as `"{x},{y},{z}"` (e.g. `"10,-10,0"`).
2. Compute CRC32 of the UTF-8 string.
3. Encode as Base36 lowercase → `name`.

Collision handling: rehash with salt `:1`, `:2`, … via `generateCubeNameWithCollisionHandling()`.

### Verified examples

| Origin (center) | Input string | Name |
|-----------------|--------------|------|
| `(0, 0, 0)` | `"0,0,0"` | `1elvszz` |
| `(10, 10, 10)` | `"10,10,10"` | `kikyhk` |
| `(10, -10, 0)` | `"10,-10,0"` | `1gqdbp2` |

---

## Utility API (`src/shared/utils/galaxy.ts`)

| Function | Purpose |
|----------|---------|
| `generateCubeName(origin)` | Derive cube `name` from center coordinates |
| `resolveCubeCenterFromGlobal(global)` | Find cube center for a global position |
| `getMinCorner(origin)` | Minimum corner of a cube |
| `localToGlobal(origin, local)` | Convert local → global coordinates |
| `globalToLocal(origin, global)` | Convert global → local coordinates |
| `isValidLocalCoords(local)` | Check `[0, 10)` bounds |
| `isGlobalInCube(origin, global)` | Check if a point lies inside a cube |
| `formatOriginKey(origin)` | Build hash input string |
| `hashOriginToName(key, salt?)` | CRC32 + Base36 name |
| `generateCubeNameWithCollisionHandling(key, isTaken)` | Name with collision retry |

---

## Constants

```typescript
CUBE_SIZE_LY = 10
CUBE_HALF_LY = 5
MIN_STARS_PER_CUBE = 5
MAX_STARS_PER_CUBE = 20
GREEK_LETTERS = ['Alpha', 'Beta', …, 'Upsilon']  // 20 entries
```

---

## Out of Scope (this phase)

- Procedural cube/star generation (see [Phase 2 spec](./galaxy-phase-2-procedural-generation.md))
- Persistence services (create, read, update)
- REST and WebSocket endpoints
- Redis caching
- Migration or removal of `StarSystem`

---

## Related Documents

- [Development plan (Phase 1)](../galaxy/development-plan.md)
- [Cube-based star system](../galaxy/cube-based-star-system.md)
- [Cube naming algorithm](../galaxy/cube-naming-specification.md)
