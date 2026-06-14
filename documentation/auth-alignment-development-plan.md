# Auth Alignment — Development Plan (Infinity Server)

```yaml
date: 2026-06-13
author: Roro LeSage
model: Composer
sources:
  - documentation/TO-BE-FIXED.md
  - documentation/stellar-gate-api.md
  - ../../documentation/TO-BE-FIXED.md
  - src/modules/auth/
  - src/main.ts
  - test/e2e/helpers/auth.helper.ts
  - documentation/infinity-api.md
  - ../../stellar-gate/documentation/infinity/stellar-gate-api.md
```

## Overview

This plan closes **TO-BE-FIXED §1** on the Infinity server: align the `auth` module with the Stellar Gate cookie contract defined in [stellar-gate/documentation/infinity/stellar-gate-api.md](../../stellar-gate/documentation/infinity/stellar-gate-api.md).

**Goal:** After login or register, the server sets an `httpOnly` cookie (`infinity_token`) and returns `{ user: { id, username, email } }`. Protected routes accept the cookie (same as Bearer JWT for tests). Session restore and logout work via `GET /me` and `POST /logout`.

**Status:** specification complete — **implementation complete** (2026-06-13). Stellar Gate client verified — see [stellar-gate/documentation/archive/auth-alignment-development-plan.md](../../stellar-gate/documentation/archive/auth-alignment-development-plan.md).

**Client dependency:** Stellar Gate verified against this contract — see [stellar-gate/documentation/archive/auth-alignment-development-plan.md](../../stellar-gate/documentation/archive/auth-alignment-development-plan.md).

**Decisions:** Product and implementation choices (Cosmos break, cookie flags, e2e migration, etc.) are locked in [Decisions](#decisions) — review before starting implementation.

---

## Current implementation

| Area | Status | Notes |
|------|--------|-------|
| Global prefix `/infinity` | **Done** | `main.ts` |
| `cookie-parser` | **Done** | `main.ts` |
| CORS `credentials: true` | **Done** | Uses `CORS_ORIGIN` from env |
| Cookie constants + set/clear helpers | **Done** | `constants/auth-cookie.ts` |
| JWT from cookie **or** Bearer | **Done** | `jwt.strategy.ts` dual extractor |
| `POST /auth/login` | **Done** | Cookie + `{ user }` |
| `POST /auth/register` | **Done** | `201`, cookie + `{ user }` |
| `POST /auth/logout` | **Done** | `clearAuthCookie`; cookie or Bearer |
| `GET /auth/me` | **Done** | Flat user object; `401` if user missing |
| Duplicate username → `409` | **Done** | Pre-check before save |
| `POST /auth/forgot-password` | **Done** | Stub `{ success: true }` |
| E2E auth helper | **Done** | Parses `Set-Cookie`; expects `201` on register |
| `infinity-api.md` | **Done** | Cookie auth documented |

---

## Target contract (summary)

| Endpoint | Auth | Success | Cookie |
|----------|------|---------|--------|
| `POST /infinity/auth/register` | No | `201` + `{ user }` | Set `infinity_token` |
| `POST /infinity/auth/login` | No | `200` + `{ user }` | Set `infinity_token` |
| `GET /infinity/auth/me` | Yes | `200` + flat `{ id, username, email }` | — |
| `POST /infinity/auth/logout` | Yes | `200` + `{ success: true }` | Clear cookie |
| `POST /infinity/auth/forgot-password` | No | `200` + `{ success: true }` | — *(optional)* |

Cookie options: `HttpOnly`, `Path=/infinity`, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, `Max-Age` aligned with JWT `expiresIn` (`1h` in `auth.module.ts`).

Errors: `400` validation, `401` invalid credentials / missing session, `409` duplicate username.

Full payloads: [stellar-gate-api.md](../../stellar-gate/documentation/infinity/stellar-gate-api.md).

**Canonical contract:** [stellar-gate/documentation/infinity/stellar-gate-api.md](../../stellar-gate/documentation/infinity/stellar-gate-api.md). The server mirror [stellar-gate-api.md](./stellar-gate-api.md) is stale (prefix, logout, checklist) — refresh in phase 4, do not treat it as source of truth during implementation.

---

## Decisions

Explicit choices for this plan. Update this section if a decision changes before or during implementation.

| # | Topic | Decision | Rationale |
|---|--------|----------|-----------|
| **D1** | Remove `access_token` from JSON | **Yes** — login/register return `{ user }` only; JWT travels in `Set-Cookie` | Matches Stellar Gate contract; no dual response |
| **D2** | Cosmos Governance regression | **Accepted** — admin login breaks until Cosmos is updated | Cosmos reads `access_token` into `sessionStorage` today; out of scope here ([TO-BE-FIXED §10](../../documentation/TO-BE-FIXED.md)). Document the break in phase 4 (`admin-api.md`, Cosmos AGENTS.md). Do **not** keep `access_token` in the body for backward compatibility |
| **D3** | Cookie `SameSite` | **`Lax` in all environments** for this iteration | Contract recommends `Strict` in production later; defer to a production-hardening pass |
| **D4** | Cookie set / clear symmetry | **Single shared options object** for `setAuthCookie` and `clearCookie` | Same `httpOnly`, `path`, `sameSite`, and `secure` (when `NODE_ENV=production`) on both; otherwise logout may fail to clear the cookie in production |
| **D5** | Forgot-password stub (phase 5) | **Ship with phases 0–4** in the same delivery | Stellar Gate UI already calls the endpoint; stub is small (~15 lines) and avoids a known broken screen |
| **D6** | E2E auth helper migration | **Migrate all callers in phase 4** — no transitional `access_token` path | Replace `registerAndGetToken` / `registerAndGetAuth` with cookie-based helpers; update `galaxy`, `planets`, and `first-planet` e2e specs in the same change set. Keep **Bearer header** support in `JwtStrategy` for tests that attach a parsed JWT from `Set-Cookie` |
| **D7** | `login()` internal shape | **`signSession(user)` returns `{ user, token }` internally**; controller sets cookie from `token` and responds with `{ user }` only | Service owns signing; controller owns HTTP/cookies — avoids duplicating JWT logic in the controller |
| **D8** | `GET /me` when user missing | **`401 Unauthorized`** if JWT is valid but DB row is gone | Treat as invalid session; do not return `500` |
| **D9** | Duplicate username detection | **Pre-check** (`findOneBy({ username })`) before `save` | Clearer errors and simpler unit tests; catch `QueryFailedError` only as a safety net |
| **D10** | Manual smoke-test entry points | **Verify all three paths** after implementation | Direct NestJS `:4000`, Stellar Gate Vite `:3001` (proxy), and Caddy `:80` — cookie `Path=/infinity` must work on each path the team uses |

**Go/no-go:** Proceed with phases **0–5** (per D5) when D1–D10 are accepted. No additional product decisions required.

---

## Migration phases

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| **0 — Shared helpers** | Code | Cookie setter/clearer + user DTO mapper + `signSession` in `auth` module |
| **1 — Login / register** | Code | Cookie on success; `{ user }` body; `201` on register |
| **2 — Session endpoints** | Code | `GET /me`; verify `POST /logout` with cookie-only auth |
| **3 — Conflict handling** | Code | Pre-check duplicate username → `409 Conflict` |
| **4 — Tests & docs** | Quality | Unit + e2e (full helper migration); update `infinity-api.md`, mirror contract, note Cosmos break |
| **5 — Forgot password** | Code | Stub `200` response; no email service *(same delivery as 0–4 per D5)* |

Phases **0–5** ship together for Stellar Gate (D5). Cosmos Governance realignment remains a separate follow-up.

---

## Phase 0 — Shared helpers

**Files:** `auth.service.ts`, new `auth-user.dto.ts` or inline mapper, `auth-cookie.ts` helper (set + clear).

| Task | Detail |
|------|--------|
| `toAuthUser(user: User)` | Return `{ id, username, email }` — never expose `password` or `role` in auth responses (D1) |
| `getAuthCookieOptions()` | Shared options: `httpOnly`, `path`, `sameSite: 'lax'`, `secure` when `NODE_ENV=production`, `maxAge` aligned with JWT `1h` (D3, D4) |
| `setAuthCookie(res, token)` / `clearAuthCookie(res)` | Use shared options on set and clear (D4) |
| `signSession(user: User)` | Sign JWT; return `{ user: toAuthUser(user), token }` for controller use (D7) |
| Refactor `login()` | Delegate to `signSession`; **do not** expose `token` in JSON responses (D1) |

Keep Bearer extraction in `JwtStrategy` unchanged; e2e tests parse `Set-Cookie` and send Bearer until helpers are migrated (D6, phase 4).

---

## Phase 1 — Login and register

**Files:** `auth.controller.ts`, `auth.service.ts`.

| Task | Detail |
|------|--------|
| Set cookie on login | Inject `@Res({ passthrough: true }) res`; `signSession` → `setAuthCookie(res, token)` → return `{ user }` |
| Set cookie on register | Same as login after `register()` creates the user |
| `@HttpCode(201)` on register | NestJS default is `200`; contract requires `201` |
| Response body | `{ user: { id, username, email } }` on both endpoints |

**Acceptance:**

```bash
curl -i -X POST http://localhost:4000/infinity/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"pilot42","password":"secret12"}' \
  -c cookies.txt
# Expect: 201, Set-Cookie: infinity_token=..., body { "user": { ... } }
```

---

## Phase 2 — Session endpoints

**Files:** `auth.controller.ts`, `auth.service.ts`.

| Task | Detail |
|------|--------|
| `GET /auth/me` | `@UseGuards(JwtAuthGuard)`; load full `User` from DB by `req.user.id` (JWT payload has no `email`) |
| Missing user | If `findById` returns `null`, throw `401` (D8) |
| Response shape | Flat object `{ id, username, email }` — **not** wrapped in `{ user }` (contract difference vs login/register) |
| Logout | Refactor to `clearAuthCookie(res)`; confirm cookie-only auth (no Bearer header) (D4) |

Add `findById(id: string): Promise<User | null>` on `AuthService` if not present.

---

## Phase 3 — Conflict handling

**Files:** `auth.service.ts`, optionally a small exception filter.

| Task | Detail |
|------|--------|
| Duplicate username | Pre-check with `findOneBy({ username })` before `save` (D9); optional `QueryFailedError` catch as safety net |
| Response | `409` with `{ statusCode: 409, message: "Username already taken", error: "Conflict" }` |

Do not expose whether email collides unless email uniqueness is added later.

---

## Phase 4 — Tests and documentation

**Files:** `auth.service.spec.ts`, new `auth.controller.spec.ts` or e2e spec, `test/e2e/helpers/auth.helper.ts`, `documentation/infinity-api.md`, cross-link contract checklist.

| Task | Detail |
|------|--------|
| Unit tests | `login` returns user shape; register creates user; duplicate username throws / maps to 409 |
| E2E helper | Replace `registerAndGetAuth` / `registerAndGetToken` with cookie-based helper; expect `201` on register; update `galaxy`, `planets`, `first-planet` specs (D6) |
| E2E auth flow | Register → cookie → `GET /me` → `POST /logout` → `GET /me` returns `401` |
| Bearer regression | Helpers may parse JWT from `Set-Cookie` and send `Authorization: Bearer` — confirm `POST /players/me/enter-game` still passes (D6) |
| Update `infinity-api.md` | Cookie auth section, new endpoints, revised Stellar Gate flow diagram |
| Refresh stale mirror | Sync [stellar-gate-api.md](./stellar-gate-api.md) checklist and “current state” with canonical contract |
| Document Cosmos break | Note in `admin-api.md` that login no longer returns `access_token` until Cosmos is realigned (D2) |
| Strike TO-BE-FIXED | Mark auth items resolved in [TO-BE-FIXED.md](./TO-BE-FIXED.md) §1 and [../../documentation/TO-BE-FIXED.md](../../documentation/TO-BE-FIXED.md) §1 |

---

## Phase 5 — Forgot password

**Files:** `auth.controller.ts`, `dto/forgot-password.dto.ts`.

| Task | Detail |
|------|--------|
| Stub endpoint | `POST /auth/forgot-password` validates email, always returns `{ success: true }` |
| No enumeration | Same response whether email exists or not |
| Email delivery | Out of scope — document as no-op until mail service exists |

Ship in the **same delivery** as phases 0–4 (D5). Unblocks Stellar Gate forgot-password UI.

---

## Out of scope (this plan)

| Item | Tracked in |
|------|------------|
| JWT revocation / Redis blacklist | Future hardening |
| Cosmos Governance client realignment (cookie / session restore) | [../../documentation/TO-BE-FIXED.md](../../documentation/TO-BE-FIXED.md) §10 — **admin login breaks** when D1 ships; document only in phase 4 |
| Caddy `/galaxy/` route after login redirect | [../../documentation/TO-BE-FIXED.md](../../documentation/TO-BE-FIXED.md) §3 |
| Stellar Gate client changes | [auth-alignment-development-plan.md](../../stellar-gate/documentation/archive/auth-alignment-development-plan.md) *(completed)* |
| `enter-game` spawn logic | [first-planet/development-plan.md](./first-planet/development-plan.md) — already works with Bearer; cookie auth is transparent once `JwtStrategy` resolves the session |

---

## Related documents

| Document | Relevance |
|----------|-----------|
| [stellar-gate-api.md](../../stellar-gate/documentation/infinity/stellar-gate-api.md) | Canonical target contract |
| [stellar-gate-api.md](./stellar-gate-api.md) | Server-side mirror / link |
| [infinity-api.md](./infinity-api.md) | Full HTTP surface to update in phase 4 |
| [TO-BE-FIXED.md](./TO-BE-FIXED.md) | Server deferred items §1 |
| [../../documentation/TO-BE-FIXED.md](../../documentation/TO-BE-FIXED.md) | Monorepo deferred items §1 |
| [auth-alignment-development-plan.md](../../stellar-gate/documentation/archive/auth-alignment-development-plan.md) | Stellar Gate verification plan (completed, archived) |
