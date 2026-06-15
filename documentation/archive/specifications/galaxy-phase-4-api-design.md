# Galaxy Phase 4 — API Design

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
version: 1.0.0
sources:
  - documentation/galaxy/development-plan.md (Phase 4)
  - documentation/specifications/galaxy-phase-3-data-storage-caching.md
  - src/modules/galaxy/cubes.controller.ts
  - src/modules/galaxy/stars.controller.ts
  - src/modules/auth/guards/jwt-auth.guard.ts
```

## Scope

Phase 4 exposes **JWT-protected REST endpoints** for cubes and stars. Coordinate conversion (`GET /coordinates/convert`) is **deferred**.

Legacy `GET /galaxy/systems/:systemId` remains **public** and unchanged.

---

## Implemented Components

| Area | Location |
|------|----------|
| JWT guard | `src/modules/auth/guards/jwt-auth.guard.ts` |
| Cubes controller | `src/modules/galaxy/cubes.controller.ts` |
| Stars controller | `src/modules/galaxy/stars.controller.ts` |
| Query DTO | `src/modules/galaxy/dto/stars-by-cube-query.dto.ts` |
| Origin parser | `src/modules/galaxy/pipes/parse-cube-origin.pipe.ts` |
| Unit tests | `cubes.controller.spec.ts`, `stars.controller.spec.ts` |

---

## Authentication

All cube and star routes use `@UseGuards(JwtAuthGuard)`.

```
Authorization: Bearer <access_token>
```

Obtain token via `POST /auth/login` or `POST /auth/register`.

---

## Endpoints

### Cubes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cubes/by-name/:name` | Lookup by hash name; **404** if missing |
| `GET` | `/cubes/:x/:y/:z/stars` | Find-or-create cube; returns `{ stars }` |
| `GET` | `/cubes/:x/:y/:z` | Find-or-create cube; returns `{ cube, stars }` |

- `x`, `y`, `z`: cube **center** coordinates (supports negatives, e.g. `/cubes/-10/0/20`).
- **400** if coordinates are not valid numbers or not grid-aligned (multiples of 10).
- JSON uses `id` (not `_id`).

### Stars

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/stars?cube_id={uuid}` | List stars for cube; **200 + `[]`** if none |
| `GET` | `/stars/:id` | Star by id (URL-encoded, e.g. `Alpha%20kikyhk`); **404** if missing |

- **400** if `cube_id` query param missing or invalid UUID.

---

## Example Responses

### `GET /cubes/10/10/10`

```json
{
  "cube": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "kikyhk",
    "origin": { "x": 10, "y": 10, "z": 10 },
    "star_ids": ["Alpha kikyhk", "Beta kikyhk"]
  },
  "stars": [
    {
      "id": "Alpha kikyhk",
      "local_coords": { "x": 1.0, "y": 2.0, "z": 3.0 },
      "cube_id": "550e8400-e29b-41d4-a716-446655440000",
      "properties": { "type": "yellow" }
    }
  ]
}
```

### `GET /stars?cube_id=550e8400-e29b-41d4-a716-446655440000`

```json
{
  "stars": []
}
```

---

## Out of Scope (this phase)

- `GET /coordinates/convert`
- Socket.IO integration (Phase 5)
- E2E / integration tests (Phase 6)

---

## Related Documents

- [Phase 3 specification](./galaxy-phase-3-data-storage-caching.md)
- [Development plan (Phase 4)](../galaxy/development-plan.md)
