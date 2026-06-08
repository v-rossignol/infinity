# Galaxy Phase 3 — Data Storage and Caching

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
version: 1.0.0
sources:
  - documentation/galaxy/development-plan.md (Phase 3)
  - documentation/specifications/galaxy-phase-2-procedural-generation.md
  - src/modules/galaxy/cube.service.ts
  - src/modules/galaxy/star.service.ts
  - src/modules/redis/redis.service.ts
```

## Scope

Phase 3 wires **MongoDB persistence** and **Redis caching** for cubes and stars. It exposes `CubeService` and `StarService` with find-or-create and lookup-by-name flows.

It does **not** include REST endpoints, Socket.IO, or star/planet mutation (Phases 4–5).

---

## Implemented Components

| Area | Location |
|------|----------|
| Redis module | `src/modules/redis/redis.module.ts` |
| Redis client | `src/modules/redis/redis.service.ts` |
| Cube persistence + cache | `src/modules/galaxy/cube.service.ts` |
| Star persistence | `src/modules/galaxy/star.service.ts` |
| Document mappers | `src/modules/galaxy/galaxy.mapper.ts` |
| Unit tests | `cube.service.spec.ts`, `star.service.spec.ts` |

---

## Read Path (`getOrCreateByOrigin`)

```
origin (grid-aligned)
  → MongoDB find by origin
      → hit: load stars, cache Redis (TTL 2 min), return
  → Redis find by origin key
      → hit: best-effort persist, return
  → generateCube(origin)
      → cache Redis (TTL 2 min)
      → best-effort persist
      → return { cube, stars }
```

## Lookup by Name (`findByName`)

1. MongoDB `findOne({ name })` → hydrate stars → cache → return.
2. Else Redis `galaxy:cube:name:{name}` → best-effort persist → return.
3. Else `null`.

---

## Redis Cache

| Key pattern | Example |
|-------------|---------|
| `galaxy:cube:origin:{x},{y},{z}` | `galaxy:cube:origin:10,10,10` |
| `galaxy:cube:id:{uuid}` | `galaxy:cube:id:550e8400-…` |
| `galaxy:cube:name:{name}` | `galaxy:cube:name:kikyhk` |

- **Value:** JSON `{ cube, stars }`
- **TTL:** `120` seconds (`GALAXY_CONSTANTS.CUBE_CACHE_TTL_SECONDS`)
- **Invalidation:** `CubeService.invalidateCache(cube)` deletes all three keys (for future star/planet updates)

---

## Persistence (Best-Effort)

1. `cubeModel.create({ _id, name, origin, star_ids })` — errors ignored (e.g. race duplicate).
2. `starModel.create(...)` per star — errors ignored individually.

No MongoDB transactions.

---

## Service API

### CubeService

| Method | Description |
|--------|-------------|
| `getOrCreateByOrigin(origin)` | Find-or-create; returns `CubeWithStars` |
| `findByName(name)` | Lookup by hash name; `null` if absent |
| `invalidateCache(cube)` | Clear Redis keys for a cube |

### StarService

| Method | Description |
|--------|-------------|
| `findByCubeId(cubeId)` | Load all stars for a cube |
| `findById(starId)` | Load one star |
| `saveManyBestEffort(stars)` | Insert stars individually |

---

## Out of Scope (this phase)

- REST / WebSocket endpoints
- Star or planet updates (cache invalidation hook only)
- Integration tests with live MongoDB/Redis
- Legacy `StarSystem` migration

---

## Related Documents

- [Phase 1 specification](./galaxy-phase-1-core-infrastructure.md)
- [Phase 2 specification](./galaxy-phase-2-procedural-generation.md)
- [Development plan (Phase 3)](../galaxy/development-plan.md)
