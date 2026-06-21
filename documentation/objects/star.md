# Star

```yaml
date: 2026-06-09
author: Roro LeSage
model: Composer
sources:
  - src/shared/interfaces/galaxy.interface.ts
  - src/modules/galaxy/entities/star.schema.ts
  - src/shared/utils/galaxy-generation.ts
  - src/shared/constants/galaxy.constants.ts
  - documentation/galaxy/cube-based-star-system.md
  - documentation/objects/star-system.md
```

## Overview

A **star** is a procedurally generated celestial body inside a parent [cube](./cube.md). Stars are created together with their cube on first access. Each star has a stable **UUID** (`id`) and a human-readable **name** derived from a Greek letter and the parent cube's hash name.

Stars are stored in MongoDB (`stars` collection) and returned alongside their cube in API and WebSocket payloads.

---

## Identity

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID v4 | Primary key. Assigned at generation time. |
| `name` | string | Display label: `{GreekLetter} {cube.name}` (e.g. `Alpha kikyhk`, `Beta 1elvszz`). Unique across stars. |

Greek letters are assigned in generation order within the cube: **Alpha**, **Beta**, **Gamma**, … **Upsilon** (supports up to 20 stars per cube).

---

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique star identifier |
| `name` | string | yes | Greek letter + parent cube `name` |
| `local_coords` | Vec3 | yes | Position inside the cube; each axis in `[0, 10)` LY, 1 decimal place |
| `cube_id` | string (UUID) | yes | Parent cube `id` |
| `properties` | object | yes | Star attributes (see below) |

### `properties`

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `type` | string | `yellow`, `red`, `blue`, `white` | Spectral type (weighted random at generation) |

**Generation weights:** yellow 50%, red 20%, white 20%, blue 10%.

### Position rules

- Stars live inside a parent cube of **10 LY** edge length; `local_coords` span **`[0, 10)`** LY on each axis.
- Stars are placed with at least **1 LY** separation from every other star in the same cube.
- **Local coordinates** are relative to the cube **minimum corner** (`origin − 5` per axis).
- **Global position** = minimum corner + `local_coords`.

Example (cube center `(10, 10, 10)`, min corner `(5, 5, 5)`):

| `name` | `local_coords` | Global position |
|--------|----------------|-----------------|
| `Alpha kikyhk` | `(2.1, 3.4, 5.6)` | `(7.1, 8.4, 10.6)` |
| `Beta kikyhk` | `(7.8, 1.2, 4.5)` | `(12.8, 6.2, 9.5)` |

---

## API representation

```json
{
  "id": "661e8400-e29b-41d4-a716-446655440001",
  "name": "Alpha kikyhk",
  "local_coords": { "x": 2.1, "y": 3.4, "z": 5.6 },
  "cube_id": "550e8400-e29b-41d4-a716-446655440000",
  "properties": { "type": "yellow" }
}
```

Stars appear in:

- `{ cube, stars }` from cube endpoints and `CUBE_DATA`
- `{ stars: [...] }` from `/infinity/cubes/:x/:y/:z/stars` and `/infinity/stars?cube_id=…`
- A single star object from `/infinity/stars/:id` and `STAR_DATA`

Use **`id`** (UUID) for lookups and references. Use **`name`** for display in the client UI.

---

## MongoDB document

Collection: **`stars`**

```json
{
  "_id": "661e8400-e29b-41d4-a716-446655440001",
  "name": "Alpha kikyhk",
  "local_coords": { "x": 2.1, "y": 3.4, "z": 5.6 },
  "cube_id": "550e8400-e29b-41d4-a716-446655440000",
  "properties": { "type": "yellow" },
  "createdAt": "2026-06-09T12:00:00.000Z",
  "updatedAt": "2026-06-09T12:00:00.000Z"
}
```

| Index | Purpose |
|-------|---------|
| `_id` | Unique (star UUID) |
| `name` | Unique display name |
| `cube_id` | List all stars in a cube |

---

## Relationships

- Each star belongs to exactly one **cube** (`cube_id` → `cube.id`).
- The parent cube's `star_ids` array lists this star's `id` (denormalized).
- The **`stars` collection** is the source of truth for star documents; cube hydration queries by `cube_id`.
- Each star may have at most one **star system** ([star-system.md](./star-system.md)): loaded **on demand** when a player enters the star (`GET`, get-or-create). The **star stays in the cube**; the system is a separate document with **`_id` and `name` equal to this star's**.

---

## Generation rules

Stars are created inside `generateCube()` when a new cube is generated:

1. Random count between **5 and 20** (inclusive).
2. Random `local_coords` in `[0, 10)` with 1 decimal, respecting 1 LY minimum separation.
3. `name` = `{GREEK_LETTERS[index]} {cube.name}`.
4. `id` = new UUID v4 per star.
5. `properties.type` from weighted random distribution.

Once persisted, the same cube `origin` always returns the same stars.

---

## Related endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/infinity/stars/:id` | Fetch star by UUID (JWT) |
| `GET` | `/infinity/stars?cube_id={uuid}` | List stars in a cube (JWT); empty array if unknown |
| `GET` | `/infinity/cubes/:x/:y/:z` | Returns cube + all its stars (JWT) |
| `GET` | `/infinity/cubes/:x/:y/:z/stars` | Returns `{ stars }` only (JWT) |
| `GET` | `/infinity/systems/:systemId` | Enter star: get or generate [star system](./star-system.md) where `_id` = star UUID (JWT) |

WebSocket:

| Event | Direction | Payload |
|-------|-----------|---------|
| `REQUEST_STAR` | Client → server | `{ starId: "<uuid>" }` |
| `STAR_DATA` | Server → client | Star object (same shape as REST) |

See [infinity-api.md](../infinity-api.md) for full request/response details.

---

## Related documents

- [cube.md](./cube.md) — parent cube object
- [star-system.md](./star-system.md) — inner system object (planets, on demand)
- [Stellar System index](../stellar-system/README.md) — implementation status and audit
- [Stellar System Summary](../stellar-system/stellar-system-summary.md) — domain reference
- [cube-based-star-system.md](../galaxy/cube-based-star-system.md) — coordinate system and galaxy layout
