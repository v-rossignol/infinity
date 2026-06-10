# Infinity - Stellar System Summary

```yaml
date: 2026-06-10
author: Roro LeSage
model: GPT-5.5
sources:
  - src/modules/galaxy/entities/star-system.schema.ts
  - src/modules/galaxy/galaxy.service.ts
  - src/modules/galaxy/galaxy.controller.ts
  - src/shared/utils/procedural-generation.ts
  - src/modules/planets/entities/planet.schema.ts
  - documentation/infinity-api.md
```

## Overview

A **stellar system** is a MongoDB document generated and retrieved by the `galaxy` module. It contains local stars and lightweight planet summaries for a single `systemId`.

The implemented route is `GET /infinity/galaxy/systems/:systemId`. It is public in the current codebase and creates the system on first read when no MongoDB document exists.

---

## Identity

| Field | Value |
|-------|-------|
| Identifier | `_id` |
| Identifier source | `systemId` route parameter |
| MongoDB schema | `StarSystem` |
| Module | `GalaxyModule` |
| Collection behavior | Mongoose schema with timestamps enabled |

---

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | `string` | yes | Unique system identifier. |
| `name` | `string` | yes | Generated as `Star System {first-eight-seed-characters}`. |
| `stars` | `object[]` | yes | Stars generated inside the system. |
| `planets` | `object[]` | yes | Lightweight generated planet summaries. |
| `visited` | `boolean` | no | Defaults to `false`; generated systems are saved with `true`. |
| `createdAt` | `Date` | automatic | Added by Mongoose timestamps. |
| `updatedAt` | `Date` | automatic | Added by Mongoose timestamps. |

### Star fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Generated as `{seed}_star_{index}`. |
| `type` | `string` | One of `yellow`, `red`, `blue`, or `white`. |
| `x` | `number` | Local 2D x-coordinate. |
| `y` | `number` | Local 2D y-coordinate. |
| `mass` | `number` | Random mass value. |
| `temperature` | `number` | Random temperature value. |

### Planet summary fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Generated as `{seed}_planet_{index}`. |
| `name` | `string` | Generated as `Planet {index + 1}`. |
| `x` | `number` | Local 2D x-coordinate near a generated star. |
| `y` | `number` | Local 2D y-coordinate near a generated star. |
| `radius` | `number` | Random radius value. |
| `type` | `string` | One of `rocky`, `gas`, `ice`, or `lava`. |
| `resources` | `Record<string, number>` | Resource quantities for `iron`, `gold`, and `water`. |

---

## API representation

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| `GET` | `/infinity/galaxy/systems/:systemId` | Public | Returns an existing stellar system or generates and stores one. |

Example response:

```json
{
  "_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Star System f47ac10b",
  "stars": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479_star_0",
      "type": "yellow",
      "x": 50,
      "y": 0,
      "mass": 1.2,
      "temperature": 6200
    }
  ],
  "planets": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479_planet_0",
      "name": "Planet 1",
      "x": 145.2,
      "y": 34.8,
      "radius": 11.4,
      "type": "rocky",
      "resources": {
        "iron": 420,
        "gold": 75,
        "water": 1300
      }
    }
  ],
  "visited": true,
  "createdAt": "2026-06-10T18:00:00.000Z",
  "updatedAt": "2026-06-10T18:00:00.000Z"
}
```

---

## MongoDB document

The `StarSystem` schema uses `_id` as a string, not a MongoDB `ObjectId`, because the route parameter is persisted directly as the document identifier.

```json
{
  "_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Star System f47ac10b",
  "stars": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479_star_0",
      "type": "white",
      "x": 50,
      "y": 0,
      "mass": 0.94,
      "temperature": 7810
    }
  ],
  "planets": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479_planet_0",
      "name": "Planet 1",
      "x": 121.4,
      "y": -43.6,
      "radius": 8.7,
      "type": "ice",
      "resources": {
        "iron": 600,
        "gold": 100,
        "water": 1800
      }
    }
  ],
  "visited": true
}
```

---

## Relationships

| Related object | Relationship |
|----------------|--------------|
| `Cube` | Cube generation is separate; cube stars are stored with `cube_id` in the `stars` collection. |
| `Star` | Stellar systems are retrieved by `systemId`; the current code does not enforce a foreign-key relationship to `Star`. |
| `Planet` | `StarSystem.planets` are embedded summaries. Detailed planet documents are generated separately by `GET /infinity/planets/:planetId`. |

---

## Generation rules

`generateStarSystem({ seed })` uses `noisejs` seeded from the `systemId` string and also uses `Math.random()` for several fields. As a result, the generated shape is partly seed-based but not fully deterministic.

| Generated value | Current rule |
|-----------------|--------------|
| System name | `Star System {seed.substring(0, 8)}` |
| Star id | `{seed}_star_{index}` |
| Star type | Random value from `yellow`, `red`, `blue`, `white` |
| Star coordinates | 2D coordinates around the system center using angle and distance |
| Planet id | `{seed}_planet_{index}` |
| Planet name | `Planet {index + 1}` |
| Planet type | Random value from `rocky`, `gas`, `ice`, `lava` |
| Planet resources | Random quantities for `iron`, `gold`, and `water` |

---

## Related endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/infinity/galaxy/systems/:systemId` | Public | Get or generate a stellar system. |
| `GET` | `/infinity/planets/:planetId` | Public | Get or generate detailed planet data. |
| `GET` | `/infinity/stars/:id` | JWT | Get a persisted cube star by id. |
| `GET` | `/infinity/stars?cube_id={uuid}` | JWT | List persisted cube stars for a cube. |

---

## Related documents

- [Development Plan](development-plan.md)
- [Infinity API](../infinity-api.md)
- [Cube Object](../objects/cube.md)
- [Star Object](../objects/star.md)