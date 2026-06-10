# Galaxy Phase 7 — Documentation

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
version: 1.0.0
sources:
  - documentation/galaxy/development-plan.md (Phase 7)
  - documentation/infinity-api.md
  - documentation/galaxy/
```

## Scope

Phase 7 consolidates galaxy documentation, aligns the API reference with the implemented `/infinity` global prefix, and updates the cube naming spec with verified CRC32 values from the codebase.

---

## Deliverables

| Item | Location | Status |
|------|----------|--------|
| Galaxy doc index | `documentation/galaxy/README.md` | Done |
| API reference (prefix + cube/star routes) | `documentation/infinity-api.md` | Done |
| Cube naming (verified examples) | `documentation/galaxy/cube-naming-specification.md` | Done |
| Data model & generation | `documentation/galaxy/cube-based-star-system.md` | Updated |
| Development plan | `documentation/galaxy/development-plan.md` | Phase 7 marked complete |
| Project README | `documentation/README.md` | Galaxy + e2e links added |
| Agent guide REST surface | `AGENTS.md` | Cube routes + prefix noted |

---

## API documentation

All REST routes use the global prefix **`/infinity`** (`src/main.ts`).

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/infinity/cubes/:x/:y/:z` | JWT |
| `GET` | `/infinity/cubes/:x/:y/:z/stars` | JWT |
| `GET` | `/infinity/cubes/by-name/:name` | JWT |
| `GET` | `/infinity/stars/:id` | JWT |
| `GET` | `/infinity/stars?cube_id={uuid}` | JWT |

Socket.IO remains on the server root (no `/infinity` prefix). See `documentation/infinity-api.md` for event names and payloads.

---

## Data model summary

### Cube (`cubes` collection)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v4 | Assigned on first persist |
| `name` | string | CRC32 + Base36 of `"x,y,z"` origin key |
| `origin` | `{ x, y, z }` | Cube center (10 LY grid) |
| `star_ids` | string[] | Star id strings (e.g. `Alpha kikyhk`) |

### Star (`stars` collection)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Greek letter + cube `name` |
| `local_coords` | `{ x, y, z }` | Relative to cube minimum corner, `[0, 10)` |
| `cube_id` | UUID | Parent cube |
| `properties.type` | string | `yellow`, `red`, `white`, or `blue` |

---

## Procedural generation summary

- **On-demand**: first request for a grid-aligned origin creates the cube and stars.
- **Deterministic**: cube `name` from origin string.
- **Non-deterministic**: star count (5–20), positions, types (weighted: yellow 50%, red/white 20%, blue 10%).
- **Constraints**: grid-aligned origin; local coords 1 decimal, min 1 LY between stars.

Implementation: `src/shared/utils/galaxy-generation.ts`.

---

## Cube naming verification

Canonical implementation: `src/shared/utils/cube-naming.ts` (IEEE CRC32, unsigned, lowercase Base36).

| Origin key | CRC32 (decimal) | Name |
|------------|-----------------|------|
| `0,0,0` | 3060064655 | `1elvszz` |
| `10,10,10` | 1240534424 | `kikyhk` |
| `10,-10,0` | 3188532854 | `1gqdbp2` |
| `123,456,789` | 4070600994 | `1vbj3tu` |
| `-100,200,-300` | 3000807806 | `1dmlq4e` |

Unit tests: `src/shared/utils/cube-naming.spec.ts`.

---

## Out of scope (unchanged)

- `GET /coordinates/convert`
- `CUBE_UPDATED` broadcasts
- Performance benchmarks
- Legacy `StarSystem` migration
