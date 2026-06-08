# Infinity Galaxy Server Development Plan

```yaml
date: 2026-06-08  
author: Roro LeSage  
model: Agent Infinity (Mistral Medium 3.5)  
sources:
  - User specifications
  - documentation/galaxy/cube-naming-specification.md
```

## Overview

This plan outlines the steps to implement the **cube-based star system** for the **Infinity** galaxy server. The focus is on procedural generation, data storage, and API design.

**Cube identity** follows [cube-naming-specification.md](./cube-naming-specification.md) and [cube-based-star-system.md](./cube-based-star-system.md):

- **`id`**: Random **UUID v4** — assigned during generation (Phase 2), persisted in MongoDB (Phase 3).
- **`name`**: Deterministic label from cube center via **CRC32 + Base36** (e.g. `kikyhk` for center `(10, 10, 10)`).
- **`origin`**: Global coordinates `[x, y, z]` of the **cube center** — spatial lookup key. Reference cube center is `(0, 0, 0)`; cube edge length is **10 LY**.

---

## Phase 1: Core Infrastructure Setup ✅ Complete

> **Status:** Completed 2026-06-08. Implementation spec: [galaxy-phase-1-core-infrastructure.md](../specifications/galaxy-phase-1-core-infrastructure.md).

### 1.1 Define Data Models

- **Cube Model**:
  - `id` (UUID v4, e.g. `"550e8400-e29b-41d4-a716-446655440000"`) — primary key
  - `name` (String, e.g. `"kikyhk"`) — CRC32 + Base36 hash of `origin`
  - `origin` ([x, y, z], global coordinates of cube **center** in LY)
  - `star_ids` (string[], star `id` references — e.g. `"Alpha kikyhk"`; **`stars` collection is source of truth**)
- **Star Model**:
  - `id` (String, e.g. `"Alpha kikyhk"`) — Greek letter + parent cube `name`
  - `local_coords` ([x, y, z], relative to cube minimum corner; each axis **`[0, 10)`**)
  - `cube_id` (UUID, reference to parent cube)
  - `properties` (Object — initially **`type` only**, one of `yellow` | `red` | `blue` | `white`)

### 1.2 Database Schema Design

- **MongoDB Collections**:
  - `cubes`: Cube metadata and `star_ids` references only.
  - `stars`: Full star documents (source of truth).
- **Indexes**:
  - `cubes`: unique on `id`; unique on `name`; index on `origin` for coordinate lookup
  - `stars`: unique on `id`; index on `cube_id` for parent lookups
- **Out of scope**: Legacy `StarSystem` model — no migration for now.

### 1.3 Coordinate System & Naming Implementation

- **Coordinate utilities**:
  - Cube half-edge = **5 LY**; minimum corner = `origin − 5` per axis.
  - `global = min_corner + local`; `local = global − min_corner`.
  - Validate local coords: **`0 ≤ axis < 10`** on each axis.
  - Resolve cube center from global position: `origin = floor((global + 5) / 10) × 10` per axis.
- **Cube naming utility** (see [cube-naming-specification.md](./cube-naming-specification.md)):
  - Format cube center as `"{x},{y},{z}"` (e.g. `"10,-10,0"`).
  - Hash with **CRC32** (unsigned) and encode as **Base36** (lowercase) to produce `name`.
  - Handle rare collisions by rehashing with a salt.
- **Constants**: `CUBE_SIZE_LY = 10`, `CUBE_HALF_LY = 5`, `MIN_STARS = 5`, `MAX_STARS = 20`.

---

## Phase 2: Procedural Generation ✅ Complete

> **Status:** Completed 2026-06-08. Implementation spec: [galaxy-phase-2-procedural-generation.md](../specifications/galaxy-phase-2-procedural-generation.md).

> **Locked decisions** — see below. Phase 2 is **pure generation** (in-memory); persistence remains Phase 3.

### 2.1 Cube Generation Algorithm

- **Input**: Grid-aligned cube center `origin` (each axis a multiple of **10** LY).
- **Output**: `{ cube: CubeData, stars: StarData[] }` with:
  - New **UUID v4** (`id`), assigned in Phase 2.
  - Deterministic **`name`** from `origin` (CRC32 + Base36 — unchanged from Phase 1).
  - `origin` from input.
  - `star_ids` populated with generated star `id` values.
  - **Non-deterministic** star count, positions, and types (each generation may differ).
- **Star count**: Uniform random integer in **`[5, 20]`** (inclusive).

### 2.2 Star Generation Algorithm

- **Input**: Cube UUID, cube `name`, and star index (index `0` → Alpha).
- **Output**: Star object with:
  - `id`: `"Alpha kikyhk"` (Greek letter + cube `name`).
  - `cube_id`: parent cube UUID.
  - `local_coords`: uniform random in **`[0, 10)`** per axis, **1 decimal** precision.
  - **Minimum separation**: **1 LY** between any two stars in the same cube.
  - `properties.type`: weighted random — **yellow 50%**, **red 20%**, **white 20%**, **blue 10%**.

### 2.3 Testing

- **Unit tests only** (no MongoDB):
  - Grid-aligned origin validation.
  - Star count within `[5, 20]`.
  - Local coords in `[0, 10)` with 1-decimal precision.
  - Minimum 1 LY separation between stars.
  - Star type distribution sanity (mocked RNG where needed).
  - Output shape matches `CubeData` / `StarData`.
  - Cube `name` remains deterministic from `origin`.

---

## Phase 3: Data Storage and Caching ✅ Complete

> **Status:** Completed 2026-06-08. Implementation spec: [galaxy-phase-3-data-storage-caching.md](../specifications/galaxy-phase-3-data-storage-caching.md).

> **Locked decisions** — see below.

### 3.1 MongoDB Integration

- **Services:** `CubeService` and `StarService` (separate from legacy `GalaxyService`).
- **Find-or-create flow** (`CubeService.getOrCreateByOrigin`):
  1. Look up cube by **`origin`** in MongoDB.
  2. If found → hydrate stars, refresh Redis cache, return `{ cube, stars }`.
  3. If not found → check Redis by `origin` key.
  4. If cached → best-effort persist to MongoDB, return payload.
  5. If not cached → `generateCube({ origin })`, cache in Redis, best-effort persist, return.
- **Find by name:** `CubeService.findByName(name)` — MongoDB first, then Redis; returns `null` if missing.
- **Persistence:** **Best-effort** — cube `create` first, then stars one-by-one; duplicate/errors swallowed.
- **Return shape:** `{ cube: CubeData, stars: StarData[] }`.
- **Immutability:** Cubes are immutable after create; `invalidateCache()` exposed for future star/planet updates.

### 3.2 Redis Caching

- **Module:** global `RedisModule` + `RedisService` (`ioredis`).
- **Cached payload:** Full `{ cube, stars }` JSON under three keys:
  - `galaxy:cube:origin:{x},{y},{z}`
  - `galaxy:cube:id:{uuid}`
  - `galaxy:cube:name:{name}`
- **TTL:** **120 seconds** (2 minutes).
- **Role:** Holds generated cubes until MongoDB write succeeds; also accelerates reads after persist.

### 3.3 Testing

- **Mocked unit tests** for `CubeService` and `StarService` (no live MongoDB/Redis).

---

## Phase 4: API Design ✅ Complete

> **Status:** Completed 2026-06-08. Implementation spec: [galaxy-phase-4-api-design.md](../specifications/galaxy-phase-4-api-design.md).

> **Builds on Phase 3:** `CubeService`, `StarService`. Legacy `GET /galaxy/systems/:systemId` remains public and unchanged.

### 4.1 Cube Endpoints

All cube routes require **JWT authentication** (`@UseGuards(JwtAuthGuard)`).

- **`GET /cubes/:x/:y/:z`**:
  - Parse `x`, `y`, `z` as numbers (cube **center** coordinates).
  - Call `CubeService.getOrCreateByOrigin({ x, y, z })`.
  - **400** if not grid-aligned (multiples of 10).
  - **200** with `{ cube, stars }` — JSON fields use `id` (not `_id`).
- **`GET /cubes/:x/:y/:z/stars`**:
  - Find-or-create cube if absent (same as full cube endpoint).
  - **200** with `{ stars: StarData[] }` only.
- **`GET /cubes/by-name/:name`**:
  - Call `CubeService.findByName(name)`.
  - **404** if not found.
  - **200** with `{ cube, stars }`.

### 4.2 Star Endpoints

All star routes require **JWT authentication**.

- **`GET /stars/:id`**:
  - Star id in path with **URL encoding** (e.g. `/stars/Alpha%20kikyhk`).
  - Call `StarService.findById(decodeURIComponent(id))`.
  - **404** if not found.
  - **200** with star document (`id` field).
- **`GET /stars?cube_id={uuid}`**:
  - Call `StarService.findByCubeId(cube_id)`.
  - **400** if `cube_id` query param missing.
  - **200** with `{ stars: StarData[] }` — **200 + `[]`** when no stars (unknown cube UUID included).

### 4.3 Coordinate Conversion Endpoints

> **Deferred** — `GET /coordinates/convert` is out of scope for Phase 4. Clients may use Phase 1 utilities locally or this can be added in a later phase.

### 4.4 Implementation Notes

- Two controllers: **`CubesController`**, **`StarsController`** under `src/modules/galaxy/`.
- DTOs with `class-validator` for path/query params.
- Unit tests: controller tests with mocked services (no live DB/Redis).

### 4.5 Testing

- Mocked controller unit tests per endpoint.
- Integration/e2e deferred to Phase 6.

---

## Phase 5: Integration with Game Server ✅ Complete

> **Status:** Completed 2026-06-08. Implementation spec: [galaxy-phase-5-socket-integration.md](../specifications/galaxy-phase-5-socket-integration.md).

> **Builds on Phase 3–4:** `CubeService`, `StarService`. WebSocket connections remain **public** (no JWT). Legacy `GALAXY_MOVE` / `GALAXY_UPDATE` unchanged.

### 5.1 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| **`REQUEST_CUBE`** | Client → server | Global position `{ x, y, z }`; server resolves cube center |
| **`CUBE_DATA`** | Server → client | `{ cube, stars }` |
| **`REQUEST_STAR`** | Client → server | `{ starId: string }` |
| **`STAR_DATA`** | Server → client | `StarData` |
| **`GALAXY_ERROR`** | Server → client | `{ event, message, statusCode }` on failure |

**`REQUEST_CUBE` flow:**

1. Resolve cube center via `resolveCubeCenterFromGlobal`.
2. `CubeService.getOrCreateByOrigin(origin)`.
3. Client joins room **`cube:{uuid}`**.
4. Emit **`CUBE_DATA`** to requesting client only.

**`GALAXY_MOVE`:** unchanged — no automatic cube loading.

### 5.2 Real-Time Updates

**Deferred** until planets-on-star feature exists. Room join on `REQUEST_CUBE` prepares for future **`CUBE_UPDATED`** broadcasts.

### 5.3 Testing

- Mocked `SocketGateway` unit tests.
- E2E WebSocket tests deferred to Phase 6.

---

## Phase 6: Testing and Validation ✅ Complete

> **Status:** Completed 2026-06-08. Implementation spec: [galaxy-phase-6-testing-validation.md](../specifications/galaxy-phase-6-testing-validation.md).

> **Unit tests (6.1)** were delivered incrementally in Phases 1–5 (`npm test` — 52 tests).

### 6.1 Unit Tests — complete

See Phase 1–5 specifications; no additional unit work required for Phase 6.

### 6.2 Integration / E2E Tests — locked decisions

| Decision | Choice |
|----------|--------|
| Scope | Galaxy + auth (JWT register helper) |
| Infrastructure | Full `AppModule` + Docker (MongoDB, Redis, PostgreSQL) |
| Data isolation | Unique grid origins per test (`nextGridOrigin()`) |
| Socket | Real `socket.io-client` against listening app |
| CI / local gate | Skip unless **`RUN_E2E=1`** |
| Legacy routes | Not covered |
| Performance (6.3) | **Deferred** |
| Coverage gate | None |

**Run:** `npm run test:e2e:docker` (requires `docker compose -f docker/docker-compose.yml up -d`).

**Files:** `test/e2e/galaxy.e2e-spec.ts`, helpers under `test/e2e/helpers/`.

### 6.3 Performance Tests

Deferred to a later phase.

---

## Phase 7: Documentation

- **API documentation**: [documentation/api.md](../api.md) — all routes under `/infinity`, cube/star REST + Socket.IO.
- **Galaxy index**: [documentation/galaxy/README.md](./README.md).
- **Data model & generation**: [cube-based-star-system.md](./cube-based-star-system.md).
- **Cube naming**: [cube-naming-specification.md](./cube-naming-specification.md) — verified CRC32 table aligned with `src/shared/utils/cube-naming.ts`.
- **Phase spec**: [galaxy-phase-7-documentation.md](../specifications/galaxy-phase-7-documentation.md).

---

## Timeline (Estimated)


| Phase | Duration | Dependencies | Status      |
| ----- | -------- | ------------ | ----------- |
| 1     | 1-2 days | None         | ✅ Complete |
| 2     | 2-3 days | Phase 1      | ✅ Complete |
| 3     | 1-2 days | Phase 2      | ✅ Complete |
| 4     | 2-3 days | Phase 3      | ✅ Complete |
| 5     | 2-3 days | Phase 4      | ✅ Complete |
| 6     | 2-3 days | Phases 1-5   | ✅ Complete |
| 7     | 1 day    | Phases 1-6   | ✅ Complete |


---

## Next Steps

Galaxy Phases 1–7 are complete. Future work (not scheduled):

- Performance benchmarks (Phase 6.3)
- `CUBE_UPDATED` broadcasts when planets attach to stars
- `GET /coordinates/convert` utility endpoint
- Legacy `StarSystem` deprecation (optional)
