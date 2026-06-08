# Infinity Galaxy Server Specification: Cube-Based Star System

```yaml
date: 2026-06-08
author: Roro LeSage
model: Agent Infinity (Mistral Medium 3.5)
sources:
  - User specifications
  - documentation/galaxy/cube-naming-specification.md
  - documentation/galaxy/development-plan.md
```

## Overview

The galaxy in **Infinity** is dynamically generated and divided into **adjacent cubes** for efficient management and procedural generation. Each cube represents a 3D section of the galaxy, containing between **5 and 20 stars** with unique properties.

---

## Units and Coordinates

- **Distance unit**: Light-year (LY).
- **Cube size**: Each cube is **10 LY × 10 LY × 10 LY**.
- **Cube center grid**: Cube centers lie on a 10 LY grid. The reference cube is centered at **`(0, 0, 0)`**.
  - Example centers: `(0, 0, 0)`, `(10, 10, 10)`, `(-10, 0, 20)`.
- **Cube identity** (see [cube-naming-specification.md](./cube-naming-specification.md)):
  - **`id`**: Random **UUID v4** — primary key, assigned on first persist.
  - **`name`**: Deterministic hash-based label derived from the cube center (`origin`) using **CRC32 + Base36** (e.g. `1elvszz` for center `(0, 0, 0)`).
  - **`origin`**: Global coordinates `[x, y, z]` of the **cube center** — spatial lookup key.

---

## Cube Structure

- **Size**: 10 LY per edge; half-edge = **5 LY**.
- **Spatial extent**: A cube centered at `origin` spans **`[origin − 5, origin + 5)`** on each axis.
- **Star count**: Each cube contains between **5 and 20** stars (inclusive).
- **Star coordinates**: Stars use **local coordinates** relative to the cube's **minimum corner** (center − 5 on each axis), in the range **`[0, 10)`** LY per axis.

---

## Star Naming Convention

- Stars are named with a **Greek letter** followed by the parent cube **`name`**.
  - Example: `Alpha kikyhk`, `Beta kikyhk`, `Gamma 1elvszz`.
- Greek letters are assigned in generation order within the cube: Alpha, Beta, Gamma, … (up to 20 stars).
- Star **`id`** uses this same string format.

---

## Coordinate System

- **Global coordinates**: Absolute position in the galaxy (e.g. `(7.0, 8.0, 6.0)` LY).
- **Local coordinates**: Position within the cube, relative to the **minimum corner** (e.g. `(2.0, 3.0, 1.0)` LY).
- **Conversion**:
  - `min_corner = origin − 5` (per axis)
  - `global = min_corner + local`
  - `local = global − min_corner`
- **Validation**:
  - Each local axis must satisfy **`0 ≤ value < 10`**.
- **Resolve cube center from global position** (per axis):
  - `origin = floor((global + 5) / 10) × 10`

### Example

Cube centered at `(10, 10, 10)`:

- Minimum corner: `(5, 5, 5)`
- Star local `(2, 3, 1)` → global `(7, 8, 6)`

---

## Data Representation

### Cube Metadata

| Field       | Type       | Description |
|-------------|------------|-------------|
| `id`        | UUID       | Primary key (random UUID v4 on first persist) |
| `name`      | String     | Hash-based label from `origin` (CRC32 + Base36, e.g. `kikyhk`) |
| `origin`    | `[x, y, z]`| Global coordinates of the cube **center** |
| `star_ids`  | string[]   | Star id strings (e.g. `Alpha kikyhk`); `stars` collection is source of truth |

> The **`stars` collection** holds full star documents. The cube document stores only **star UUID references**, not embedded star data.

### Star Metadata

| Field          | Type       | Description |
|----------------|------------|-------------|
| `id`           | String     | Greek letter + cube `name` (e.g. `Beta kikyhk`) |
| `local_coords` | `[x, y, z]`| Coordinates relative to the cube minimum corner; each axis in `[0, 10)` |
| `cube_id`      | UUID       | Parent cube `id` |
| `properties`   | Object     | Star attributes; initially **`type` only** (one of `yellow`, `red`, `blue`, `white`) |

---

## Procedural Generation

- Cubes are generated **on-demand** as players explore the galaxy.
- Cube **`name`** is **deterministic** from `origin`; star count, positions, and types are **non-deterministic** (random each generation).
- Cube **`id`** is a random UUID v4 assigned during generation (Phase 2).
- Star count per cube: uniform random in **5–20** (inclusive).
- Star local coordinates: uniform random in **`[0, 10)`**, **1 decimal** precision, **minimum 1 LY** separation between stars.
- Star **`properties.type`**: weighted random — yellow **50%**, red **20%**, white **20%**, blue **10%**.
- Input `origin` must be a **grid-aligned** cube center (each axis a multiple of 10 LY).

---

## Example

### Cube centered at `(10, 10, 10)`

- **`origin`**: `(10, 10, 10)` LY
- **`name`**: `kikyhk` (CRC32 + Base36 of `"10,10,10"`)
- **`id`**: e.g. `550e8400-e29b-41d4-a716-446655440000` (UUID v4, assigned at persist)
- **Minimum corner**: `(5, 5, 5)`
- **Stars**:
  - `Alpha kikyhk`: local `(2.1, 3.4, 5.6)` → global `(7.1, 8.4, 10.6)`
  - `Beta kikyhk`: local `(7.8, 1.2, 4.5)` → global `(12.8, 6.2, 9.5)`
  - `Gamma kikyhk`: local `(5.0, 8.9, 2.3)` → global `(10.0, 13.9, 7.3)`

### Reference cube centered at `(0, 0, 0)`

- **`origin`**: `(0, 0, 0)` LY
- **`name`**: `1elvszz` (CRC32 + Base36 of `"0,0,0"`)
- **Minimum corner**: `(-5, -5, -5)`
- **Spatial extent**: `[-5, 5)` on each axis

---

## Implementation Notes

- **Storage**: MongoDB — separate `cubes` and `stars` collections.
- **Caching**: Redis — full `{ cube, stars }` payload, TTL 120 s (`CubeService`).
- **Legacy `StarSystem`**: Unchanged; no migration required.
- **REST endpoints** (JWT, prefix `/infinity`):
  - `GET /infinity/cubes/:x/:y/:z` — find or create cube by center coordinates
  - `GET /infinity/cubes/:x/:y/:z/stars` — stars only
  - `GET /infinity/cubes/by-name/:name` — lookup by hash name (no generation)
  - `GET /infinity/stars/:id` — star by id
  - `GET /infinity/stars?cube_id={uuid}` — list stars in a cube
- **WebSocket**: `REQUEST_CUBE`, `CUBE_DATA`, `STAR_DATA` (public; see `documentation/api.md`).

---

## Related Documents

- [Galaxy documentation index](./README.md)
- [Cube naming specification](./cube-naming-specification.md) — CRC32 + Base36 algorithm
- [Development plan](./development-plan.md) — phased implementation
