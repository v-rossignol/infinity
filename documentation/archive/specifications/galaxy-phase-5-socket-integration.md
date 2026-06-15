# Galaxy Phase 5 — Socket Integration

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
version: 1.0.0
sources:
  - documentation/galaxy/development-plan.md (Phase 5)
  - src/modules/socket/socket.gateway.ts
  - src/modules/socket/events/galaxy.events.ts
```

## Scope

Phase 5 adds **Socket.IO events** for cube and star data, wired to `CubeService` and `StarService`. WebSocket connections remain **public** (no JWT).

Real-time **`CUBE_UPDATED`** broadcasts are **deferred** until planets-on-star exists.

---

## Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `REQUEST_CUBE` | Client → server | `{ x, y, z }` global position (LY) |
| `CUBE_DATA` | Server → client | `{ cube, stars }` |
| `REQUEST_STAR` | Client → server | `{ starId: string }` |
| `STAR_DATA` | Server → client | `StarData` |
| `GALAXY_ERROR` | Server → client | `{ event, message, statusCode }` |

Legacy events unchanged: `GALAXY_MOVE`, `GALAXY_UPDATE`, `PLANET_MOVE`, `PLANET_UPDATE`.

---

## REQUEST_CUBE

1. Validate global `{ x, y, z }`.
2. `origin = resolveCubeCenterFromGlobal(position)`.
3. `CubeService.getOrCreateByOrigin(origin)`.
4. `client.join("cube:{uuid}")`.
5. `client.emit("CUBE_DATA", payload)`.

---

## REQUEST_STAR

1. Validate `starId`.
2. `StarService.findById(starId)`.
3. Emit `STAR_DATA` or `GALAXY_ERROR` (404).

---

## Cube rooms

Room name: **`cube:{cube.id}`** (UUID). Joined on successful `REQUEST_CUBE` for future broadcasts.

---

## Related Documents

- [Phase 4 specification](./galaxy-phase-4-api-design.md)
- [Development plan (Phase 5)](../galaxy/development-plan.md)
