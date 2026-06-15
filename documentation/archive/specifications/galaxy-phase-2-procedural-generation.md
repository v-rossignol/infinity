# Galaxy Phase 2 — Procedural Generation

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
version: 1.0.0
sources:
  - documentation/galaxy/development-plan.md (Phase 2)
  - documentation/galaxy/cube-based-star-system.md
  - documentation/specifications/galaxy-phase-1-core-infrastructure.md
  - src/shared/utils/galaxy-generation.ts
  - src/shared/utils/galaxy-generation.spec.ts
```

## Scope

Phase 2 delivers **in-memory procedural generation** for cubes and stars. It builds on Phase 1 types and utilities and returns `{ cube: CubeData, stars: StarData[] }`.

It does **not** include MongoDB persistence, Redis caching, REST endpoints, or Socket.IO integration (Phases 3–5).

---

## Implemented Components

| Area | Location |
|------|----------|
| Generation logic | `src/shared/utils/galaxy-generation.ts` |
| Public exports | `src/shared/utils/galaxy.ts` |
| Unit tests | `src/shared/utils/galaxy-generation.spec.ts` |

---

## Generation Rules

| Aspect | Rule |
|--------|------|
| Input | Grid-aligned cube center `origin` (each axis a multiple of **10** LY) |
| Cube `id` | Random **UUID v4** (`crypto.randomUUID`) |
| Cube `name` | **Deterministic** — CRC32 + Base36 from `origin` (Phase 1) |
| Star count | Uniform random integer in **`[5, 20]`** (inclusive) |
| Star positions | Uniform random in **`[0, 10)`** per axis, **1 decimal** precision |
| Star separation | Minimum **1 LY** (3D Euclidean distance) between any two stars |
| Star `id` | `{GreekLetter} {cube.name}` — e.g. `"Alpha kikyhk"` |
| Star `type` | Weighted random (see below) |
| Determinism | **Non-deterministic** for count, positions, and types; `name` only is stable |

### Star type weights

| Type | Weight |
|------|--------|
| yellow | 50% |
| red | 20% |
| white | 20% |
| blue | 10% |

---

## Algorithms

### Star count

```
count = floor(random × (MAX − MIN + 1)) + MIN   // MIN=5, MAX=20
```

### Local coordinates

Each axis: pick an integer step in `[0, 99]`, divide by 10 → value in `[0.0, 9.9]`.

### Star placement (minimum separation)

For each star, up to **1000** rejection attempts:

1. Sample random local coordinates.
2. Accept if 3D distance to every existing star is **≥ 1 LY**.
3. If all attempts fail, throw an error.

### Star naming

Greek letters from `GREEK_LETTERS` by index: Alpha, Beta, … Upsilon (supports up to 20 stars).

---

## Output Shape

```typescript
{
  cube: {
    id: string;           // UUID v4
    name: string;         // e.g. "kikyhk"
    origin: Vec3;
    star_ids: string[];   // e.g. ["Alpha kikyhk", "Beta kikyhk", …]
  },
  stars: [{
    id: string;
    local_coords: Vec3;
    cube_id: string;      // matches cube.id
    properties: { type: StarType };
  }, …]
}
```

---

## Utility API

| Function | Purpose |
|----------|---------|
| `generateCube({ origin, random?, uuid? })` | Generate a full cube + stars |
| `generateStarPositions({ count, random?, maxAttemptsPerStar? })` | Place stars with min separation |
| `isGridAlignedOrigin(origin)` | Validate grid-aligned center |
| `pickWeightedStarType(random?)` | Sample star type by weight |
| `randomLocalCoords(random?)` | Single random local position |
| `hasMinimumSeparation(candidate, existing)` | Check 1 LY separation |

Optional injectable `random` and `uuid` functions support unit testing.

---

## Constants (generation-specific)

```typescript
MIN_STAR_SEPARATION_LY = 1
LOCAL_COORD_DECIMALS = 1
STAR_TYPE_WEIGHTS = [
  { type: 'yellow', weight: 0.5 },
  { type: 'red',    weight: 0.2 },
  { type: 'white',  weight: 0.2 },
  { type: 'blue',   weight: 0.1 },
]
```

Shared galaxy constants (`MIN_STARS_PER_CUBE`, `MAX_STARS_PER_CUBE`, `GREEK_LETTERS`) are defined in Phase 1.

---

## Unit Tests

| Test area | Coverage |
|-----------|----------|
| Grid alignment | Accepts/rejects origin multiples of 10 |
| Local bounds | Values in `[0, 10)` with 1 decimal |
| Separation | 20 stars placed ≥ 1 LY apart |
| Type weights | Cumulative thresholds with mocked RNG |
| Output shape | `CubeData` / `StarData` fields and cross-references |
| Non-determinism | Repeated calls produce different layouts |
| Validation | Non-grid origin throws |

---

## Out of Scope (this phase)

- Saving cubes or stars to MongoDB
- Lookup by existing `origin` / `name`
- Redis caching
- REST and WebSocket endpoints
- Deterministic / seeded generation

---

## Related Documents

- [Phase 1 specification](./galaxy-phase-1-core-infrastructure.md)
- [Development plan (Phase 2)](../galaxy/development-plan.md)
- [Cube-based star system](../galaxy/cube-based-star-system.md)
