# Infinity Server — REST & WebSocket API

```yaml
date: 2026-06-11
author: Roro LeSage
model: Composer
type: API Reference
sources:
  - src/modules/auth/
  - src/modules/players/
  - src/modules/players/player-spawn.service.ts
  - documentation/first-planet/first-planet-specifications.md
  - src/modules/galaxy/
  - src/modules/planets/
  - src/modules/resources/
  - src/modules/socket/
  - src/main.ts
  - documentation/objects/cube.md
  - documentation/objects/star.md
  - documentation/objects/star-system.md
  - src/config/socket.config.ts
  - documentation/specifications/galaxy-phase-4-api-design.md
```

Reference for **implemented** HTTP routes and Socket.IO events on the Infinity NestJS server. This document reflects the current codebase, not planned contracts (see `documentation/stellar-gate-api.md` for the StellarGate client auth target).

---

## Base URL

| Environment | URL |
|-------------|-----|
| Local development | `http://localhost:4000/infinity` |

Port is configurable via the `PORT` environment variable (default `4000`).

### Global route prefix

All REST routes are mounted under **`/infinity`** via `app.setGlobalPrefix('infinity')` in `src/main.ts`. Paths in this document include that prefix (e.g. `/infinity/auth/login`). Socket.IO connects to the server root (`http://localhost:4000`) — there is no `/infinity` prefix on the WebSocket URL.

---

## Cross-cutting behavior

### Content type

All REST endpoints accept and return **JSON** (`Content-Type: application/json`).

### Validation

A global `ValidationPipe` is active. Invalid request bodies return **400 Bad Request** with a NestJS validation error payload:

```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 6 characters"],
  "error": "Bad Request"
}
```

### CORS

CORS is enabled with `origin: '*'` and `credentials: true` (development only — restrict before production).

### Authentication

| Aspect | Value |
|--------|-------|
| Mechanism | JWT signed with `JWT_SECRET` |
| Token delivery | `httpOnly` cookie `infinity_token` on `POST /infinity/auth/login` and `POST /infinity/auth/register` (`Path=/infinity`, `SameSite=Lax`, `Secure` when `NODE_ENV=production`) |
| Token lifetime | `1h` (`JwtModule` `signOptions.expiresIn` in `auth.module.ts`; cookie `Max-Age` matches) |
| Authenticated requests | Cookie `infinity_token` (browser / same-origin clients) **or** `Authorization: Bearer <jwt>` (API tests, scripts) |
| Session restore | `GET /infinity/auth/me` — flat `{ id, username, email }` |
| Logout | `POST /infinity/auth/logout` — clears cookie |
| Protected routes | **Cube, star, star-system, auth session endpoints, and first spawn** require a valid JWT |
| Public routes | Health, auth register/login/forgot-password, `GET /infinity/players/:userId`, planets, resources |

See [auth.md](./auth.md) for how clients must handle sessions (cookie vs Bearer, lifecycle, pitfalls). Endpoint payloads: [infinity-api.md](./infinity-api.md) (Auth section) and [stellar-gate-api.md](./stellar-gate-api.md).

---

## REST endpoints

### Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/infinity/health` | Public | Server health check |
| `POST` | `/infinity/auth/register` | Public | Create account; set session cookie; return `{ user }` |
| `POST` | `/infinity/auth/login` | Public | Authenticate; set session cookie; return `{ user }` |
| `GET` | `/infinity/auth/me` | JWT | Restore session — flat user object |
| `POST` | `/infinity/auth/logout` | JWT | Clear session cookie |
| `POST` | `/infinity/auth/forgot-password` | Public | Stub — always `{ success: true }` (no email sent) |
| `POST` | `/infinity/players/me/enter-game` | JWT | Bootstrap first planet spawn; return playable state |
| `GET` | `/infinity/players/:userId` | Public | Get or create player profile for a user |
| `PATCH` | `/infinity/players/me/location` | JWT | Replace player `location` (full JSONB object or `null`) |
| `POST` | `/infinity/players/me/location/enter-system` | JWT | View transition: cube → star system |
| `POST` | `/infinity/players/me/location/enter-planet` | JWT | View transition: star system → planet |
| `POST` | `/infinity/players/me/location/leave-planet` | JWT | View transition: planet → star system |
| `POST` | `/infinity/players/me/location/leave-system` | JWT | View transition: star system → cube |
| `PATCH` | `/infinity/players/me/location/cube` | JWT | Update local cube position (cube depth) |
| `PATCH` | `/infinity/players/me/location/system` | JWT | Update star-system map position (system depth) |
| `GET` | `/infinity/galaxy/systems/:systemId` | JWT | Get or generate a star system (`systemId` = star UUID) |
| `GET` | `/infinity/cubes/by-name/:name` | JWT | Get cube and stars by hash-based name |
| `GET` | `/infinity/cubes/:x/:y/:z` | JWT | Get or generate cube and stars by center coordinates |
| `GET` | `/infinity/cubes/:x/:y/:z/stars` | JWT | Get or generate cube; return stars only |
| `GET` | `/infinity/stars/:id` | JWT | Get star by id |
| `GET` | `/infinity/stars?cube_id={uuid}` | JWT | List stars in a cube |
| `GET` | `/infinity/planets/:planetId` | Public | Get or generate a planet |
| `GET` | `/infinity/resources/planet/:planetId` | Public | List resources on a planet |

---

### Health

#### `GET /infinity/health`

Lightweight health check. Does not verify database connectivity.

**Success response — 200 OK**

```json
{
  "name": "infinity-server",
  "version": "0.3.0",
  "status": "OK"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Package name from `package.json` |
| `version` | string | Semantic version from `package.json` |
| `status` | string | Always `"OK"` when the server is running |

---

### Auth

#### `POST /infinity/auth/register`

Create a new user account and establish a session.

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `username` | string | yes | non-empty |
| `password` | string | yes | min length 6 |
| `email` | string | no | valid email if provided |

**Example request**

```http
POST /infinity/auth/register
Content-Type: application/json

{
  "username": "pilot42",
  "password": "secret123",
  "email": "pilot@example.com"
}
```

**Success response — 201 Created**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "pilot42",
    "email": "pilot@example.com"
  }
}
```

**Cookie:** `Set-Cookie: infinity_token=<jwt>; HttpOnly; Path=/infinity; SameSite=Lax; Max-Age=3600`

**Error responses**

| Status | Condition |
|--------|-----------|
| `400` | Validation failure (missing username, short password, invalid email) |
| `409` | Username already taken |

---

#### `POST /infinity/auth/login`

Validate credentials and establish a session.

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `username` | string | yes | non-empty |
| `password` | string | yes | min length 6 |

**Example request**

```http
POST /infinity/auth/login
Content-Type: application/json

{
  "username": "pilot42",
  "password": "secret123"
}
```

**Success response — 200 OK**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "pilot42",
    "email": "pilot@example.com"
  }
}
```

**Cookie:** same as register.

JWT payload (decoded):

```json
{
  "username": "pilot42",
  "sub": "<user-uuid>",
  "role": "user",
  "iat": 1717776000,
  "exp": 1717779600
}
```

**Error responses**

| Status | Body |
|--------|------|
| `401 Unauthorized` | `{ "statusCode": 401, "message": "Invalid credentials" }` |
| `400 Bad Request` | Validation errors |

---

#### `GET /infinity/auth/me`

Restore the current session. Response is a **flat** user object (not wrapped in `{ user }`).

**Authentication:** JWT via cookie or Bearer header.

**Success response — 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "pilot42",
  "email": "pilot@example.com"
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| `401` | Missing, invalid, or expired JWT; user no longer exists |

---

#### `POST /infinity/auth/logout`

Clear the session cookie.

**Authentication:** JWT via cookie or Bearer header.

**Success response — 200 OK**

```json
{
  "success": true
}
```

**Cookie:** `Set-Cookie: infinity_token=; …; Max-Age=0`

---

#### `POST /infinity/auth/forgot-password`

Stub endpoint — validates email format and returns success. No email is sent.

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes (valid email) |

**Success response — 200 OK**

```json
{
  "success": true
}
```

Always returns `200`, even when the email is not registered.

### Players

Player data is stored in **PostgreSQL** (TypeORM `Player` entity).

#### `GET /infinity/players/:userId`

Fetch the player profile linked to a user. If none exists, a new **freshy** player is created (`location: null`).

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `userId` | UUID string | `User.id` from auth |

**Success response — 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "location": null,
  "createdAt": "2026-06-07T12:00:00.000Z",
  "updatedAt": "2026-06-07T12:00:00.000Z"
}
```

The `user` relation is not eagerly loaded in the response.

**Freshy clients:** When `location` is `null`, the player is authenticated but not yet in the world. Call `POST /infinity/players/me/enter-game` (JWT) to spawn or resume.

**Location shapes** depend on active view depth — see [wip/player-location/player-location.md](./wip/player-location/player-location.md) and [wip/player-location/example.json](./wip/player-location/example.json).

---

#### `POST /infinity/players/me/enter-game`

Bootstrap a **first-time** playable world for the authenticated user, or return the existing player when `location` is already set. Intended entry point after StellarGate login (see [first-planet/first-planet-specifications.md](./first-planet/first-planet-specifications.md) and [wip/player-location/player-location.md](./wip/player-location/player-location.md)).

**Authentication:** JWT required — cookie `infinity_token` or `Authorization: Bearer <jwt>`. The server resolves the user from the token payload (`sub` → `User.id`).

**Request body:** empty (no body).

**Example request**

```http
POST /infinity/players/me/enter-game
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success response — 200 OK**

Returns the player profile only. **`location.planet.id`** is the primary handoff for Terra View; load planet surface and galaxy context via separate REST calls.

```json
{
  "player": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "location": {
      "cube": { "id": "550e8400-e29b-41d4-a716-446655440000" },
      "starSystem": { "id": "661e8400-e29b-41d4-a716-446655440001" },
      "planet": {
        "id": "661e8400-e29b-41d4-a716-446655440001_planet_0",
        "hex_coords": { "q": 2, "r": 5 }
      }
    },
    "createdAt": "2026-06-11T12:00:00.000Z",
    "updatedAt": "2026-06-11T12:05:00.000Z"
  }
}
```

Before first spawn (`location` is `null`):

```json
{
  "player": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "location": null,
    "createdAt": "2026-06-11T12:00:00.000Z",
    "updatedAt": "2026-06-11T12:00:00.000Z"
  }
}
```

| Field | Description |
|-------|-------------|
| `player.location` | Contextual position — **planet depth** after first spawn; `null` for a **freshy** |
| `player.location.planet.id` | Use with `GET /infinity/planets/:planetId` for surface data |
| `player.location.planet.hex_coords` | Spawn hex `{ q, r }` persisted in PostgreSQL |

**Server behavior (first entry)**

1. Find or create `Player` for JWT `sub` (`location: null`).
2. If `location` is set → return `{ player }` immediately; **no** world re-fetch.
3. Otherwise orchestrate spawn: pick adjacent cube origin → create cube + stars → random star → star system → **largest `rocky` planet** → materialize `Planet` + surface → random hex → persist `Player.location` **last** (planet depth).

**Server behavior (repeat call)**

Idempotent: returns the same `{ player }` for an already-spawned player without creating new cubes or planets.

**Error responses**

| Status | Condition |
|--------|-----------|
| `401 Unauthorized` | Missing or invalid JWT |
| `503 Service Unavailable` | `{ "statusCode": 503, "message": "Unable to allocate spawn location" }` — spawn retries exhausted (extremely unlikely) |

**Client flow (StellarGate first entry)**

1. `POST /infinity/auth/register` or `POST /infinity/auth/login` → session cookie `infinity_token`
2. `GET /infinity/auth/me` (optional) — restore session on app load
3. `POST /infinity/players/me/enter-game` — cookie sent automatically on same-origin requests
4. `GET /infinity/planets/:planetId` — load surface using `player.location.planet.id`
5. Socket.IO `PLANET_JOIN` with `planetId` — real-time surface sync (see planet events)

See [stellar-gate-api.md](./stellar-gate-api.md) for the full auth contract.

---

#### Player location (JWT required)

Authenticated routes under `/infinity/players/me/location`. All successful responses return `{ player }` with the updated `location`. Prefer **transition** routes for view changes; use **patch** routes for moves within the current depth.

Spec: [wip/player-location/player-location.md](./wip/player-location/player-location.md).

##### `PATCH /infinity/players/me/location`

Replace the full `location` object (or set `null` to clear — rarely needed; freshy is normally `location: null` before first spawn).

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location` | object \| `null` | yes | Full depth shape per spec, or `null` |

**Example — planet depth**

```http
PATCH /infinity/players/me/location
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "location": {
    "cube": { "id": "550e8400-e29b-41d4-a716-446655440000" },
    "starSystem": { "id": "661e8400-e29b-41d4-a716-446655440001" },
    "planet": {
      "id": "661e8400-e29b-41d4-a716-446655440001_planet_0",
      "hex_coords": { "q": 4, "r": 7 }
    }
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| `400` | Invalid `location` shape (invariant violation) |
| `401` | Missing or invalid JWT |
| `404` | Player not found for authenticated user |

##### View transitions

| Route | From depth | To depth | Body fields |
|-------|------------|----------|-------------|
| `POST …/enter-system` | cube | star system | `starSystemId`, `x`, `y` |
| `POST …/enter-planet` | star system | planet | `planetId`, `q`, `r` |
| `POST …/leave-planet` | planet | star system | `x`, `y` |
| `POST …/leave-system` | star system | cube | `x`, `y`, `z` (local cube coords) |

**409 Conflict** when the player is not at the required source depth.

##### Position patches (same depth)

| Route | Depth | Body |
|-------|-------|------|
| `PATCH …/location/cube` | cube | `{ x, y, z }` local `[0, 10)` LY per axis |
| `PATCH …/location/system` | star system | `{ x, y }` |

**409 Conflict** when the player is not at the matching depth.

---

### Galaxy

The galaxy module exposes two models:

- **Cube-based galaxy** (new) — cubes and stars in MongoDB (`cubes`, `stars` collections), cached in **Redis** (TTL 2 minutes). Protected by JWT.
- **Star systems** — inner view (planets) when entering a cube star; `StarSystem._id` = `Star.id`. See [stellar-system/stellar-system-summary.md](./stellar-system/stellar-system-summary.md).

See also: [objects/cube.md](./objects/cube.md), [objects/star.md](./objects/star.md), [objects/star-system.md](./objects/star-system.md), `documentation/galaxy/cube-based-star-system.md`, `documentation/specifications/galaxy-phase-4-api-design.md`.

---

#### Cubes (JWT required)

Each cube is a **10 LY cube** (edge length **10 LY** on every axis). Cube **centers** lie on a 10 LY grid (e.g. `(0, 0, 0)`, `(10, 10, 10)`, `(-10, 0, 20)`), so adjacent cubes meet face-to-face with no gap. Coordinates in the URL are the cube **center**, not the minimum corner.

##### `GET /infinity/cubes/:x/:y/:z`

Find an existing cube by center coordinates, or **generate and persist** a new one if absent.

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `x` | number | Cube center X (light-years; multiple of 10) |
| `y` | number | Cube center Y |
| `z` | number | Cube center Z |

**Example request**

```http
GET /infinity/cubes/10/10/10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success response — 200 OK**

```json
{
  "cube": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "kikyhk",
    "origin": { "x": 10, "y": 10, "z": 10 },
    "star_ids": [
      "661e8400-e29b-41d4-a716-446655440001",
      "662e8400-e29b-41d4-a716-446655440002"
    ]
  },
  "stars": [
    {
      "id": "661e8400-e29b-41d4-a716-446655440001",
      "name": "Alpha kikyhk",
      "local_coords": { "x": 1.0, "y": 2.0, "z": 3.0 },
      "cube_id": "550e8400-e29b-41d4-a716-446655440000",
      "properties": { "type": "yellow" }
    },
    {
      "id": "662e8400-e29b-41d4-a716-446655440002",
      "name": "Beta kikyhk",
      "local_coords": { "x": 7.8, "y": 1.2, "z": 4.5 },
      "cube_id": "550e8400-e29b-41d4-a716-446655440000",
      "properties": { "type": "red" }
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cube.id` | UUID string | Cube primary key |
| `cube.name` | string | Hash-based label (CRC32 + Base36 of origin) |
| `cube.origin` | object | Cube center `{ x, y, z }` in light-years |
| `cube.star_ids` | string[] | Star UUIDs in this cube (denormalized; see [star.md](./objects/star.md)) |
| `stars[].id` | UUID string | Star primary key |
| `stars[].name` | string | Display label (Greek letter + cube `name`, e.g. `"Alpha kikyhk"`) |
| `stars[].local_coords` | object | Position within cube, relative to minimum corner |
| `stars[].cube_id` | UUID string | Parent cube `id` |
| `stars[].properties.type` | string | `yellow`, `red`, `blue`, or `white` |

**Error responses**

| Status | Condition |
|--------|-----------|
| `401 Unauthorized` | Missing or invalid JWT |
| `400 Bad Request` | Invalid coordinate values or origin not grid-aligned (not a multiple of 10) |

> **Note:** Star count (5–20), positions, and types are random on first generation. The cube `name` is deterministic from `origin`. Once persisted, the same `origin` always returns the same cube.

---

##### `GET /infinity/cubes/:x/:y/:z/stars`

Same find-or-create behavior as `GET /infinity/cubes/:x/:y/:z`, but returns only the star list.

**Success response — 200 OK**

```json
{
  "stars": [
    {
      "id": "661e8400-e29b-41d4-a716-446655440001",
      "name": "Alpha kikyhk",
      "local_coords": { "x": 1.0, "y": 2.0, "z": 3.0 },
      "cube_id": "550e8400-e29b-41d4-a716-446655440000",
      "properties": { "type": "yellow" }
    }
  ]
}
```

Each star object matches the shape documented in [star.md](./objects/star.md).

---

##### `GET /infinity/cubes/by-name/:name`

Look up a cube by its hash-based name. Does **not** generate a new cube.

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `name` | string | Cube name (e.g. `kikyhk`) |

**Example request**

```http
GET /infinity/cubes/by-name/kikyhk
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success response — 200 OK**

Same shape as `GET /infinity/cubes/:x/:y/:z` (`{ cube, stars }`).

**Error responses**

| Status | Condition |
|--------|-----------|
| `404 Not Found` | No cube with that name in MongoDB or Redis cache |
| `401 Unauthorized` | Missing or invalid JWT |

---

#### Stars (JWT required)

##### `GET /infinity/stars/:id`

Fetch a single star by its UUID.

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `id` | UUID string | Star primary key |

**Example request**

```http
GET /infinity/stars/661e8400-e29b-41d4-a716-446655440001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success response — 200 OK**

```json
{
  "id": "661e8400-e29b-41d4-a716-446655440001",
  "name": "Alpha kikyhk",
  "local_coords": { "x": 1.0, "y": 2.0, "z": 3.0 },
  "cube_id": "550e8400-e29b-41d4-a716-446655440000",
  "properties": { "type": "yellow" }
}
```

Use `name` for display in the client; use `id` for lookups and references.

**Error responses**

| Status | Condition |
|--------|-----------|
| `404 Not Found` | Star not found |
| `401 Unauthorized` | Missing or invalid JWT |

---

##### `GET /infinity/stars?cube_id={uuid}`

List all stars belonging to a cube.

**Query parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `cube_id` | UUID string | yes | Parent cube `id` |

**Example request**

```http
GET /infinity/stars?cube_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success response — 200 OK**

```json
{
  "stars": [
    {
      "id": "661e8400-e29b-41d4-a716-446655440001",
      "name": "Alpha kikyhk",
      "local_coords": { "x": 1.0, "y": 2.0, "z": 3.0 },
      "cube_id": "550e8400-e29b-41d4-a716-446655440000",
      "properties": { "type": "yellow" }
    }
  ]
}
```

Returns an empty array (`{ "stars": [] }`) when the cube has no stars or the UUID is unknown.

**Error responses**

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | Missing or invalid `cube_id` |
| `401 Unauthorized` | Missing or invalid JWT |

---

#### Star systems (JWT)

A star system is built when a player **enters** a cube star. **`StarSystem._id` = `Star.id`** (UUID) and **`StarSystem.name` = `Star.name`**. The star remains in the `stars` collection; the system holds **planets only** and local layout. Load the parent star via `GET /infinity/stars/:id`. See [objects/star-system.md](./objects/star-system.md) and [stellar-system-summary.md](./stellar-system/stellar-system-summary.md).

Star systems are stored in **MongoDB** (Mongoose). Systems are **generated on first access** if the id does not exist. First-time generation is **non-deterministic** (`Math.random()`), seeded by the star UUID; star properties do not alter layout. Once persisted, the same id returns the saved document.

##### `GET /infinity/galaxy/systems/:systemId`

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `systemId` | string | Parent star UUID (`Star.id`). **404** if no matching star exists. |

**Example request**

```http
GET /infinity/galaxy/systems/661e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <jwt>
```

**Success response — 200 OK**

```json
{
  "_id": "661e8400-e29b-41d4-a716-446655440001",
  "name": "Alpha kikyhk",
  "planets": [
    {
      "id": "661e8400-e29b-41d4-a716-446655440001_planet_0",
      "name": "Planet 1",
      "x": 142.8,
      "y": 67.3,
      "radius": 9,
      "type": "rocky",
      "resources": {
        "iron": 742,
        "gold": 128,
        "water": 1533
      }
    }
  ],
  "visited": true,
  "createdAt": "2026-06-07T12:00:00.000Z",
  "updatedAt": "2026-06-07T12:00:00.000Z"
}
```

**Planet types:** `rocky`, `gas`, `ice`, `lava`

Planet count and layout are procedurally generated on first access. The same id returns the persisted system after the first save.

> **Star linkage:** When loading a planet from a star system, pass `?systemId={starUuid}` where `starUuid` is the parent star UUID (same as `StarSystem._id`). Planet ids in embedded summaries use `{starUuid}_planet_{index}`.

**Error responses**

| Status | Condition |
|--------|-----------|
| `401 Unauthorized` | Missing or invalid JWT |
| `404 Not Found` | Star not found (no system generated) |

---

### Planets

Landable planet surfaces are stored in **MongoDB** as **`Planet`** documents with a nested toroidal hex grid (`surface.hexagons[]`). A document is **created on first player entry** when the `planetId` does not exist yet. **Gas planets** never get a document.

See [planets/hexagonal-planet-specification.md](./planets/hexagonal-planet-specification.md) for domain rules.

#### `GET /infinity/planets/:planetId`

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `planetId` | string | Same as `StarSystem.planets[].id` — MongoDB `_id` and procedural generation seed |

**Query parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `systemId` | string | **Yes on first entry**; optional on reload | Parent star UUID (`StarSystem._id`). Used to load the matching `planets[]` summary when creating the document. |

**Example request (first entry from star-system view)**

```http
GET /infinity/planets/661e8400-e29b-41d4-a716-446655440001_planet_0?systemId=661e8400-e29b-41d4-a716-446655440001
```

**Example request (reload — document already exists)**

```http
GET /infinity/planets/661e8400-e29b-41d4-a716-446655440001_planet_0
```

**Success response — 200 OK**

```json
{
  "_id": "661e8400-e29b-41d4-a716-446655440001_planet_0",
  "name": "Planet 1",
  "starSystemId": "661e8400-e29b-41d4-a716-446655440001",
  "type": "rocky",
  "radius": 5,
  "resources": {
    "iron": 420,
    "gold": 75,
    "water": 1300
  },
  "surface": {
    "hexagons": [
      {
        "biome": "desert",
        "resources": [],
        "dangerLevel": 3,
        "coordinates": { "q": 0, "r": 0 }
      }
    ],
    "generatedAt": "2026-06-11T12:00:00.000Z"
  },
  "createdAt": "2026-06-11T12:00:00.000Z",
  "updatedAt": "2026-06-11T12:00:00.000Z"
}
```

> The example shows **one** hex in `surface.hexagons`. A full surface contains **`radius × radius`** cells (25 when `radius` is 5). Per-hex `resources` are **`[]`** in the current MVP.

| Field | Description |
|-------|-------------|
| `_id` | Same as summary `planets[].id` |
| `name` | Inherited from `StarSystem.planets[].name` |
| `starSystemId` | Parent star UUID |
| `type` | Inherited — `rocky`, `gas`, `ice`, or `lava` (only landable types get a document) |
| `radius` | Inherited odd integer **5–15** — hex grid edge length; `radius × radius` cells |
| `resources` | Inherited summary quantities from `StarSystem.planets[].resources` |
| `surface.hexagons` | Generated toroidal hex layer |
| `surface.hexagons[].biome` | `desert`, `forest`, `ocean`, `mountain`, `ice`, or `volcanic` |
| `surface.hexagons[].resources` | Per-hex deposits — empty array in MVP |
| `surface.hexagons[].dangerLevel` | Integer `0–10` |
| `surface.hexagons[].coordinates` | Axial `q`, `r` with `0 ≤ q, r < radius` |
| `surface.generatedAt` | Timestamp of first surface generation |

**Server behavior**

1. If a **`Planet`** document exists → return it (`systemId` optional).
2. If no document → **`systemId` required**. Load `StarSystem`, find matching `planets[]` entry.
3. If summary `type` is **`gas`** → **422**; no document created.
4. If landable → copy inherited fields, generate `surface`, save, return **200**.

**Error responses**

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | First entry without `systemId` |
| `404 Not Found` | `planetId` not found in `StarSystem.planets[]` (or star system missing) |
| `422 Unprocessable Entity` | Summary `type` is `gas` — no enterable surface |

> **Client flow:** Enter star → `GET /infinity/galaxy/systems/:systemId` → pick a landable planet from `planets[]` → `GET /infinity/planets/:planetId?systemId={starId}`. Disable entry UI for `type: gas`.

---

### Resources

Resource deposits are stored in **MongoDB** as separate documents linked by `planetId`.

#### `GET /infinity/resources/planet/:planetId`

List all resource nodes on a planet.

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `planetId` | string | Planet identifier |

**Example request**

```http
GET /infinity/resources/planet/661e8400-e29b-41d4-a716-446655440001_planet_0
```

**Success response — 200 OK**

Returns an array (possibly empty if no resource documents exist for that planet):

```json
[
  {
    "_id": "665a1b2c3d4e5f6789012345",
    "planetId": "alpha-centauri_planet_0",
    "type": "iron",
    "x": 24,
    "y": 31,
    "quantity": 100,
    "createdAt": "2026-06-07T12:00:00.000Z",
    "updatedAt": "2026-06-07T12:00:00.000Z"
  }
]
```

**Resource types** (game constants): `iron`, `gold`, `water`, `crystal`

> **Note:** Procedural planet generation populates aggregate `resources` on the planet document but does not automatically create individual `Resource` collection entries. This endpoint reads the dedicated `resources` collection only.

---

## WebSocket API (Socket.IO)

The server attaches Socket.IO to the same HTTP port as the REST API.

| Setting | Value |
|---------|-------|
| Namespace | `/` (default) |
| Transports | `websocket` only |
| CORS | `origin: '*'` |
| Connection recovery | 2 minutes max disconnection |

Connect from a client (authenticated moves):

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  transports: ['websocket'],
  auth: { token: '<jwt>' },
});
```

### Events summary

| Direction | Event | Description |
|-----------|-------|-------------|
| Client → Server | `GALAXY_MOVE` | Player moved at **cube depth**; persists `cube.position` |
| Server → Client | `GALAXY_UPDATE` | Broadcast cube movement `{ playerId, x, y, z }` |
| Client → Server | `SYSTEM_MOVE` | Player moved at **star-system depth**; persists `starSystem.position` |
| Server → Client | `SYSTEM_UPDATE` | Broadcast system map movement `{ playerId, x, y }` |
| Client → Server | `REQUEST_CUBE` | Request cube + stars for a **global** position |
| Server → Client | `CUBE_DATA` | Cube and stars payload (to requesting client) |
| Client → Server | `REQUEST_STAR` | Request star data by id |
| Server → Client | `STAR_DATA` | Star document (to requesting client) |
| Server → Client | `GALAXY_ERROR` | Error response for cube/star requests |
| Client → Server | `PLANET_JOIN` | Join planet room; restore hex from PostgreSQL or roll spawn |
| Client → Server | `PLANET_LEAVE` | Leave planet room |
| Client → Server | `PLANET_MOVE` | Player moved on hex surface `(q, r)` |
| Server → Client | `PLANET_UPDATE` | Planet-room position update `{ playerId, planetId, q, r }` |
| Server → Client | `PLANET_ERROR` | Error response for planet socket handlers |
| Server → Client | `SYSTEM_ERROR` | Error response for system socket handlers |

**Authentication:** Planet and move handlers (`GALAXY_MOVE`, `SYSTEM_MOVE`, `PLANET_JOIN`, `PLANET_MOVE`) require a JWT on connect — pass `auth: { token }` in the Socket.IO handshake, or send `Authorization: Bearer` / cookie `infinity_token`. The server resolves **`Player.id`** (not socket id) for persistence and broadcasts. Read-only galaxy requests (`REQUEST_CUBE`, `REQUEST_STAR`) work without auth.

---

### `REQUEST_CUBE` (client → server)

Request cube and star data for the cube containing a **global** galaxy position. The server resolves the cube center, find-or-creates the cube, joins the client to room `cube:{uuid}`, and responds with `CUBE_DATA`.

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Global galaxy X (light-years) |
| `y` | number | Global galaxy Y |
| `z` | number | Global galaxy Z |

**Example**

```javascript
socket.emit('REQUEST_CUBE', { x: 7.1, y: 8.4, z: 10.6 });
```

**Server behavior**

- Resolves cube center from global position (e.g. `(7.1, 8.4, 10.6)` → center `(10, 10, 10)`)
- Loads or generates cube via `CubeService.getOrCreateByOrigin`
- Joins client to Socket.IO room `cube:{cube.id}`
- Emits `CUBE_DATA` to the **requesting client only**

---

### `CUBE_DATA` (server → client)

**Payload:** same shape as `GET /infinity/cubes/:x/:y/:z` — `{ cube, stars }`.

```javascript
socket.on('CUBE_DATA', (data) => {
  // {
  //   cube: { id, name, origin, star_ids },
  //   stars: [{ id, name, local_coords, cube_id, properties }, ...]
  // }
});
```

---

### `REQUEST_STAR` (client → server)

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `starId` | UUID string | Star primary key (`stars[].id`) |

```javascript
socket.emit('REQUEST_STAR', { starId: '661e8400-e29b-41d4-a716-446655440001' });
```

**Server behavior**

- Loads star via `StarService.findById`
- Emits `STAR_DATA` or `GALAXY_ERROR` (404) to the requesting client

---

### `STAR_DATA` (server → client)

**Payload:** same shape as `GET /infinity/stars/:id`.

```json
{
  "id": "661e8400-e29b-41d4-a716-446655440001",
  "name": "Alpha kikyhk",
  "local_coords": { "x": 1.0, "y": 2.0, "z": 3.0 },
  "cube_id": "550e8400-e29b-41d4-a716-446655440000",
  "properties": { "type": "yellow" }
}
```

---

### `GALAXY_ERROR` (server → client)

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Source event (`REQUEST_CUBE` or `REQUEST_STAR`) |
| `message` | string | Error description |
| `statusCode` | number | HTTP-style code (400, 404, 500) |

---

### `GALAXY_MOVE` (client → server)

Notify the server of a position change at **cube depth** (local 3D coordinates inside the cube volume).

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Local cube X `[0, 10)` LY |
| `y` | number | Local cube Y |
| `z` | number | Local cube Z |

**Example**

```javascript
socket.emit('GALAXY_MOVE', { x: 2.1, y: 3.4, z: 5.6 });
```

**Server behavior**

- Requires authenticated socket (JWT → `Player.id`)
- Persists `cube.position` in PostgreSQL via `PlayerLocationService.updateCubePosition`
- Broadcasts `GALAXY_UPDATE` to **all** connected clients
- Emits `GALAXY_ERROR` (`401` / `409`) on auth or depth mismatch
- Does **not** load or emit cube data (use `REQUEST_CUBE` separately)

---

### `GALAXY_UPDATE` (server → client)

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | **`Player.id`** (UUID) |
| `x` | number | Local cube X |
| `y` | number | Local cube Y |
| `z` | number | Local cube Z |

```javascript
socket.on('GALAXY_UPDATE', (data) => {
  // { playerId: 'a1b2c3d4-...', x: 2.1, y: 3.4, z: 5.6 }
});
```

---

### `SYSTEM_MOVE` (client → server)

Notify the server of a position change at **star-system depth** (2D map coordinates).

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | System map X |
| `y` | number | System map Y |

**Example**

```javascript
socket.emit('SYSTEM_MOVE', { x: 145.2, y: 34.8 });
```

**Server behavior**

- Requires authenticated socket
- Persists `starSystem.position` in PostgreSQL
- Broadcasts `SYSTEM_UPDATE` to all clients
- Emits `SYSTEM_ERROR` (`401` / `409`) on failure

---

### `SYSTEM_UPDATE` (server → client)

**Payload:** `{ playerId, x, y }` — `playerId` is **`Player.id`**.

---

### `SYSTEM_ERROR` (server → client)

Same shape as `PLANET_ERROR`: `{ event, message, statusCode }`.

---

### `PLANET_JOIN` (client → server)

Join the Socket.IO room named after `planetId` and resolve the player's hex position. Call after the planet document exists — via `POST /infinity/players/me/enter-game` (first entry) or `GET /infinity/planets/:planetId` (manual star-system entry).

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `planetId` | string | Planet identifier (room name) |

**Example**

```javascript
socket.emit('PLANET_JOIN', { planetId: '661e8400-e29b-41d4-a716-446655440001_planet_0' });
```

**Server behavior**

1. Restore `(q, r)` from **`Player.location`** when the player is already at planet depth on this planet.
2. Otherwise pick a **random** hex with `0 ≤ q, r < radius`, persist planet-depth `location` in PostgreSQL.
3. Add the client to room `planetId`.
4. Emit `PLANET_UPDATE` to the room (including the joining client).

**Error responses** — server emits `PLANET_ERROR` to the requesting client:

| Status | Condition |
|--------|-----------|
| `400` | Missing `planetId` |
| `401` | Unauthenticated socket |
| `404` | Planet document not found (REST load required first) |
| `409` | Player on a different planet |

---

### `PLANET_LEAVE` (client → server)

Leave the planet Socket.IO room. **`Player.location`** in PostgreSQL is unchanged.

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `planetId` | string | Planet identifier (room name) |

```javascript
socket.emit('PLANET_LEAVE', { planetId: '661e8400-e29b-41d4-a716-446655440001_planet_0' });
```

---

### `PLANET_MOVE` (client → server)

Notify the server of movement on a planet hex surface. All moves are accepted in the MVP (no bounds or neighbor validation yet).

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `planetId` | string | Planet identifier (room name) |
| `q` | number | Axial hex coordinate |
| `r` | number | Axial hex coordinate |

**Example**

```javascript
socket.emit('PLANET_MOVE', {
  planetId: '661e8400-e29b-41d4-a716-446655440001_planet_0',
  q: 2,
  r: 4,
});
```

**Server behavior**

- Requires authenticated socket
- Persists `planet.hex_coords` in PostgreSQL (`Player.location`)
- Emits `PLANET_UPDATE` to room `planetId`
- Emits `PLANET_ERROR` (`401` / `409`) when not at planet depth or wrong planet

---

### `PLANET_UPDATE` (server → client)

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | **`Player.id`** (UUID) |
| `planetId` | string | Planet identifier |
| `q` | number | Axial hex coordinate |
| `r` | number | Axial hex coordinate |

```javascript
socket.on('PLANET_UPDATE', (data) => {
  // { playerId: 'abc123', planetId: '661e8400-..._planet_0', q: 2, r: 4 }
});
```

---

### `PLANET_ERROR` (server → client)

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Source event (`PLANET_JOIN`, `PLANET_MOVE`, …) |
| `message` | string | Human-readable error |
| `statusCode` | number | Suggested HTTP-style code |

---

## Typical client flow

```mermaid
sequenceDiagram
  participant Client
  participant REST as REST API
  participant WS as Socket.IO
  participant DB as PostgreSQL / MongoDB

  Client->>REST: POST /infinity/auth/register
  REST->>DB: Create User
  REST-->>Client: Set-Cookie infinity_token + { user }

  Client->>REST: GET /infinity/auth/me (optional)
  REST-->>Client: { id, username, email }

  Client->>REST: POST /infinity/players/me/enter-game (cookie or Bearer)
  REST->>DB: Spawn cube, star system, planet; update Player
  REST-->>Client: { player } (location.planet.id after spawn)

  Client->>REST: GET /infinity/planets/{planetId}
  REST-->>Client: Planet + surface

  Client->>WS: connect (auth.token JWT)
  Client->>WS: PLANET_JOIN { planetId }
  WS->>DB: Player.location (PostgreSQL)
  WS-->>Client: PLANET_UPDATE { playerId, q, r }

  Note over Client,REST: Manual galaxy navigation (optional)

  Client->>REST: GET /infinity/cubes/{x}/{y}/{z} (Bearer token)
  REST->>DB: Find or generate Cube + Stars
  REST-->>Client: { cube, stars }

  Client->>REST: GET /infinity/galaxy/systems/{systemId} (Bearer token)
  REST->>DB: Find or generate StarSystem
  REST-->>Client: Star system + planet list

  Client->>REST: GET /infinity/planets/{planetId}?systemId={starId}
  REST->>DB: Find or generate Planet (hex surface)
  REST-->>Client: Planet + surface.hexagons[]

  Client->>WS: REQUEST_CUBE { x, y, z } (global)
  WS-->>Client: CUBE_DATA { cube, stars }

  Client->>WS: GALAXY_MOVE { x, y, z }
  WS-->>Client: GALAXY_UPDATE (broadcast)
```

---

## Related documentation

| Document | Scope |
|----------|-------|
| `documentation/objects/cube.md` | Cube object — fields, storage, relationships |
| `documentation/objects/star.md` | Star object — fields, naming, storage |
| `documentation/objects/star-system.md` | Star system object — enter-star, planets, generation |
| `documentation/objects/planet.md` | Planet object — hex surface document |
| `documentation/planets/hexagonal-planet-specification.md` | Hex planet surface — grid, generation, REST behavior |
| `documentation/planets/development-plan.md` | Hex planet implementation phases and test plan |
| `documentation/stellar-system/README.md` | Stellar system feature — implementation status |
| `documentation/first-planet/first-planet-specifications.md` | First spawn orchestration rules and selection algorithms |
| `documentation/wip/player-location/player-location.md` | Contextual player location model (JSONB, view depth, transitions) |
| `documentation/admin-api.md` | Admin REST API — `/infinity/admin/*` routes (JWT + admin role) |
| `documentation/stellar-gate-api.md` | Target auth contract for the StellarGate client (cookie-based JWT, `/infinity` prefix) |
| `documentation/galaxy/README.md` | Galaxy documentation index (design, naming, phase specs) |
| `documentation/specifications/galaxy-phase-4-api-design.md` | Phase 4 cube/star REST implementation spec |
| `AGENTS.md` | Module architecture, env vars, dev commands |
| `documentation/server-setup.md` | Deployment and infrastructure |

---

## Not implemented (out of scope for this reference)

- JWT revocation / Redis session blacklist
- Real forgot-password email delivery
- `GET /infinity/coordinates/convert` (coordinate utility endpoint)
- `CUBE_UPDATED` broadcasts (deferred until planets-on-star)
- REST endpoint for resource harvesting (`ResourcesService.harvest` is service-only)
- Redis-backed session caching (Redis is used for cube cache only; player location is PostgreSQL JSONB)
