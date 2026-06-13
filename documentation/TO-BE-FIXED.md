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

**Problem:** StellarGate expects **cookie-based** session auth (`infinity_token`, `httpOnly`). The Infinity server still returns JWT in the JSON body and `JwtStrategy` reads only the `Authorization: Bearer` header. `GET /infinity/auth/me` and cookie logout are not implemented. First-planet spawn (`POST /infinity/players/me/enter-game`) needs a authenticated `userId` but does not depend on cookie transport — the two features are separate workstreams that must **align** before StellarGate can call `enter-game` in production without manual Bearer tokens.

**MVP decision:** Implement spawn with **Bearer JWT** in tests and dev. StellarGate integration waits until cookie auth matches [stellar-gate-api.md](./stellar-gate-api.md).

**Fix later (auth module + client):**

| Task | Module / area |
|------|----------------|
| Set `infinity_token` cookie on `register` and `login` (`HttpOnly`, `Path=/infinity`) | `auth` |
| Return `{ user: { id, username, email } }` instead of `{ access_token }` | `auth` |
| `201` on register | `auth` |
| Implement `GET /infinity/auth/me` | `auth` |
| Implement `POST /infinity/auth/logout` (clear cookie) | `auth` |
| Extend `JwtStrategy` to extract JWT from `infinity_token` cookie (keep Bearer for API tests) | `auth` |
| `409` on duplicate username | `auth` |
| ~~`app.setGlobalPrefix('infinity')` if not already applied~~ | ~~`main.ts`~~ *(done)* |
| StellarGate client: `enter-game` after login with same-origin cookie | client |

Spawn (`PlayerSpawnService`, `enter-game`) needs **no auth code** — only `JwtAuthGuard` resolving `userId` from header or cookie once the strategy is extended.

**Priority:** Medium — blocks end-to-end StellarGate → first planet in production; does not block spawn implementation or unit tests.

---

## 2. First-planet spawn — resume in-progress allocation

**Source:** [first-planet/first-planet-specifications.md](./first-planet/first-planet-specifications.md) — § Partial failure on `enter-game`

**Problem:** `POST /infinity/players/me/enter-game` uses random cube/star selection. If the request creates world objects (cube, star system, planet, Redis position) but fails **before** `Player.currentPlanetId` is persisted, a client retry may place the same player in a **different** world.

**MVP decision:** Acceptable. Mitigation today: persist the `Player` row **last** (single `updatePosition` after all generation).

**Fix later:**

- Add optional fields on `Player`, e.g. `spawnPending: boolean` and/or `spawnOrigin`, `spawnPlanetId`, to record an in-progress allocation.
- On retry, if `spawnPending` is set, **resume** the existing cube/star/planet instead of re-rolling.
- Clear `spawnPending` once `currentPlanetId` is saved.
- Optionally garbage-collect orphaned cubes/planets from abandoned partial spawns.

**Priority:** Low — rare edge case (network/server fault between generation and final DB write).

---

## Related documents

| Document | Relevance |
|----------|-----------|
| [documentation/TO-BE-FIXED.md](../../documentation/TO-BE-FIXED.md) | Cross-project deferred issues (monorepo) |
| [stellar-gate-api.md](./stellar-gate-api.md) | Target cookie auth contract |
| [first-planet/first-planet-specifications.md](./first-planet/first-planet-specifications.md) | Spawn flow; auth vs spawn separation |
