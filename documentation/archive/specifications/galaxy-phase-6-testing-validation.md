# Galaxy Phase 6 — Testing and Validation

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
version: 1.0.0
sources:
  - documentation/galaxy/development-plan.md (Phase 6)
  - test/e2e/galaxy.e2e-spec.ts
  - test/e2e/helpers/
```

## Scope

Phase 6 adds **e2e tests** for the cube galaxy (REST + Socket.IO + auth). Unit tests were completed in Phases 1–5. Performance benchmarks are **deferred**.

---

## Running tests

| Command | Description |
|---------|-------------|
| `npm test` | Unit tests (always; no Docker required) |
| `npm run test:e2e` | E2e skipped unless `RUN_E2E=1` |
| `npm run test:e2e:docker` | Sets `RUN_E2E=1` and runs e2e |

**Prerequisites for e2e:**

```bash
docker compose -f deployment/dev/docker/docker-compose.yml up -d
npm run test:e2e:docker
```

---

## E2E coverage

### REST (JWT via register helper)

- `401` without token on `/infinity/cubes/:x/:y/:z`
- Find-or-create cube + stars
- Idempotent second request (same cube `id`)
- `/cubes/:x/:y/:z/stars` stars-only response
- `/cubes/by-name/:name`
- `/stars/:id` (URL-encoded)
- `/stars?cube_id=` — includes empty array for unknown UUID

### WebSocket (`socket.io-client`)

- `REQUEST_CUBE` → `CUBE_DATA` (global position)
- `REQUEST_STAR` → `STAR_DATA`
- `REQUEST_STAR` missing → `GALAXY_ERROR` (404)

---

## Test helpers

| File | Purpose |
|------|---------|
| `create-e2e-app.ts` | Bootstrap app with `/infinity` prefix + Socket adapter |
| `auth.helper.ts` | Register unique user, return JWT |
| `grid-origin.helper.ts` | Unique grid-aligned origins per test |
| `socket.helper.ts` | Connect client, emit/wait helpers |

---

## Decisions

- **Scope:** Galaxy + auth only
- **Infrastructure:** Docker + full `AppModule`
- **Isolation:** Unique origins (no manual DB cleanup)
- **Gate:** `RUN_E2E=1` required
- **Not covered:** Legacy star systems, performance, coverage thresholds

---

## Related Documents

- [Phase 5 specification](./galaxy-phase-5-socket-integration.md)
- [Development plan (Phase 6)](../galaxy/development-plan.md)
