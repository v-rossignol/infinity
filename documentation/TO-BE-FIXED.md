# TO-BE-FIXED — Deferred Issues

```yaml
date: 2026-06-11
author: Roro LeSage
model: Composer
sources:
  - documentation/first-planet/first-planet-specifications.md
  - documentation/stellar-gate-api.md
  - ../../documentation/TO-BE-FIXED.md
  - src/modules/auth/
```

Tracked issues that are **accepted for MVP** or **out of scope for the current task**, to be addressed in a later iteration. Add new entries at the bottom; do not remove resolved items — strike through or move to an archive section when done.

**Cross-project deferred issues** (auth mismatch, missing clients, Caddy routes, and other monorepo-wide gaps) are tracked in the global [documentation/TO-BE-FIXED.md](../../documentation/TO-BE-FIXED.md). This file covers **server-only** items.

---

## 1. StellarGate cookie auth vs spawn

**Source:** [first-planet/first-planet-specifications.md](./first-planet/first-planet-specifications.md) — § StellarGate auth vs spawn logic; contract in [stellar-gate-api.md](./stellar-gate-api.md)

**Status:** **Resolved** (2026-06-13) — cookie session, `/me`, `/logout`, forgot-password stub, `409` on duplicate username. Stellar Gate verified — see [../../stellar-gate/documentation/archive/auth-alignment-development-plan.md](../../stellar-gate/documentation/archive/auth-alignment-development-plan.md).

**Remaining (client):**

| Task | Module / area |
|------|----------------|
| StellarGate client: verify end-to-end auth + `enter-game` with same-origin cookie | `stellar-gate` |

Spawn (`PlayerSpawnService`, `enter-game`) accepts cookie or Bearer JWT via `JwtStrategy`.

**Resolved (server — 2026-06-13):**

| Task | Module / area |
|------|----------------|
| ~~Set `infinity_token` cookie on `register` and `login` (`HttpOnly`, `Path=/infinity`)~~ | ~~`auth`~~ |
| ~~Return `{ user: { id, username, email } }` instead of `{ access_token }`~~ | ~~`auth`~~ |
| ~~`201` on register~~ | ~~`auth`~~ |
| ~~Implement `GET /infinity/auth/me`~~ | ~~`auth`~~ |
| ~~Implement `POST /infinity/auth/logout` (clear cookie)~~ | ~~`auth`~~ |
| ~~Extend `JwtStrategy` to extract JWT from `infinity_token` cookie (keep Bearer for API tests)~~ | ~~`auth`~~ |
| ~~`409` on duplicate username~~ | ~~`auth`~~ |
| ~~Implement `POST /infinity/auth/forgot-password` stub~~ | ~~`auth`~~ |
| ~~`app.setGlobalPrefix('infinity')`~~ | ~~`main.ts`~~ |

**Priority:** Medium — server done; client smoke test unblocks end-to-end StellarGate → first planet.

---

## 2. First-planet spawn — resume in-progress allocation

**Source:** [first-planet/first-planet-specifications.md](./first-planet/first-planet-specifications.md) — § Partial failure on `enter-game`

**Problem:** `POST /infinity/players/me/enter-game` uses random cube/star selection. If the request creates world objects (cube, star system, planet) but fails **before** `Player.location` is persisted, a client retry may place the same player in a **different** world.

**MVP decision:** Acceptable. Mitigation today: persist the `Player` row **last** (single `setLocation` after all generation).

**Fix later:**

- Add optional fields on `Player`, e.g. `spawnPending: boolean` and/or `spawnOrigin`, `spawnPlanetId`, to record an in-progress allocation.
- On retry, if `spawnPending` is set, **resume** the existing cube/star/planet instead of re-rolling.
- Clear `spawnPending` once `location` is saved.
- Optionally garbage-collect orphaned cubes/planets from abandoned partial spawns.

**Priority:** Low — rare edge case (network/server fault between generation and final DB write).

---

## Related documents

| Document | Relevance |
|----------|-----------|
| [documentation/TO-BE-FIXED.md](../../documentation/TO-BE-FIXED.md) | Cross-project deferred issues (monorepo) |
| [stellar-gate-api.md](./stellar-gate-api.md) | Target cookie auth contract |
| [first-planet/first-planet-specifications.md](./first-planet/first-planet-specifications.md) | Spawn flow; auth vs spawn separation |
