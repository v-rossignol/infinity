# Galaxy — Documentation Index

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
sources:
  - documentation/galaxy/development-plan.md
  - src/modules/galaxy/
  - src/shared/utils/
```

Central index for the **cube-based galaxy** feature (Phases 1–7 complete).

---

## Design

| Document | Description |
|----------|-------------|
| [cube-based-star-system.md](./cube-based-star-system.md) | Coordinates, cube/star data model, procedural generation rules |
| [cube-naming-specification.md](./cube-naming-specification.md) | CRC32 + Base36 naming algorithm and verified examples |
| [development-plan.md](./development-plan.md) | Phased implementation plan and status |

---

## Phase specifications

Implementation specs locked during development:

| Phase | Document | Topic |
|-------|----------|-------|
| 1 | [galaxy-phase-1-core-infrastructure.md](../specifications/galaxy-phase-1-core-infrastructure.md) | Constants, interfaces, schemas, coordinate utils |
| 2 | [galaxy-phase-2-procedural-generation.md](../specifications/galaxy-phase-2-procedural-generation.md) | On-demand star generation |
| 3 | [galaxy-phase-3-data-storage-caching.md](../specifications/galaxy-phase-3-data-storage-caching.md) | MongoDB + Redis cache |
| 4 | [galaxy-phase-4-api-design.md](../specifications/galaxy-phase-4-api-design.md) | REST endpoints (JWT) |
| 5 | [galaxy-phase-5-socket-integration.md](../specifications/galaxy-phase-5-socket-integration.md) | Socket.IO events |
| 6 | [galaxy-phase-6-testing-validation.md](../specifications/galaxy-phase-6-testing-validation.md) | E2E tests |
| 7 | [galaxy-phase-7-documentation.md](../specifications/galaxy-phase-7-documentation.md) | Documentation consolidation |

---

## API reference

REST and WebSocket contracts for cube/star endpoints (including the `/infinity` global prefix):

- [documentation/infinity-api.md](../infinity-api.md) — full server API reference

---

## Source code

| Area | Path |
|------|------|
| Galaxy module | `src/modules/galaxy/` |
| Redis cache | `src/modules/redis/` |
| Socket gateway | `src/modules/socket/socket.gateway.ts` |
| Constants & interfaces | `src/shared/constants/galaxy.constants.ts`, `src/shared/interfaces/galaxy.interface.ts` |
| Coordinates & naming | `src/shared/utils/coordinates.ts`, `cube-naming.ts` |
| Generation | `src/shared/utils/galaxy-generation.ts` |
| E2E tests | `test/e2e/galaxy.e2e-spec.ts` |

---

## Quick reference

| Concept | Value |
|---------|-------|
| Cube edge | 10 LY |
| Cube centers | Multiples of 10 on each axis; reference center `(0, 0, 0)` |
| Star count | 5–20 per cube (uniform random) |
| Star local coords | `[0, 10)` LY, 1 decimal, min 1 LY separation |
| Cube `name` | Deterministic: CRC32(`"{x},{y},{z}"`) → Base36 lowercase |
| Cube `id` | Random UUID v4 on first persist |
| REST prefix | `/infinity` (e.g. `GET /infinity/cubes/0/0/0`) |
| Cache TTL | 120 s (Redis, full `{ cube, stars }` payload) |

**Example names:** `(0,0,0)` → `1elvszz`; `(10,10,10)` → `kikyhk`.
