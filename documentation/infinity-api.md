# Infinity Server — REST & WebSocket API

```yaml
date: 2026-06-09
author: Roro LeSage
model: Composer
type: API Reference
sources:
  - src/modules/auth/
  - src/modules/players/
  - src/modules/galaxy/
  - src/modules/planets/
  - src/modules/resources/
  - src/modules/socket/
  - src/main.ts
  - documentation/objects/cube.md
  - documentation/objects/star.md
  - src/config/app.config.ts
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

### Authentication (current state)

| Aspect | Value |
|--------|-------|
| Mechanism | JWT signed with `JWT_SECRET` |
| Token delivery | JSON field `access_token` on `POST /infinity/auth/login` and `POST /infinity/auth/register` |
| Token lifetime | `1h` (`JwtModule` `signOptions.expiresIn` in `auth.module.ts`) |
| Header | `Authorization: Bearer <access_token>` |
| Protected routes | **Cube and star endpoints** (`/infinity/cubes/*`, `/infinity/stars/*`) require a valid JWT |
| Public routes | Health, auth, players, legacy galaxy star systems, planets, resources |

---

## REST endpoints

### Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/infinity/health` | Public | Server health check |
| `POST` | `/infinity/auth/register` | Public | Create account and return JWT |
| `POST` | `/infinity/auth/login` | Public | Authenticate and return JWT |
| `GET` | `/infinity/players/:userId` | Public | Get or create player profile for a user |
| `PATCH` | `/infinity/players/:playerId/position` | Public | Update player position |
| `GET` | `/infinity/galaxy/systems/:systemId` | Public | Get or generate a legacy star system |
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

Create a new user account. On success, returns a JWT (same shape as login).

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

**Success response — 201 Created** (implicit 200 from NestJS default)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| `400` | Validation failure (missing username, short password, invalid email) |
| `500` | Username already exists (PostgreSQL unique constraint on `username`) |

---

#### `POST /infinity/auth/login`

Validate credentials and return a JWT.

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
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

JWT payload (decoded):

```json
{
  "username": "pilot42",
  "sub": "<user-uuid>",
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

### Players

Player data is stored in **PostgreSQL** (TypeORM `Player` entity).

#### `GET /infinity/players/:userId`

Fetch the player profile linked to a user. If none exists, a new player is created with default position `(0, 0, 0)`.

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `userId` | UUID string | `User.id` from auth |

**Success response — 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "galaxyX": 0,
  "galaxyY": 0,
  "galaxyZ": 0,
  "currentPlanetId": null,
  "planetX": 0,
  "planetY": 0,
  "createdAt": "2026-06-07T12:00:00.000Z",
  "updatedAt": "2026-06-07T12:00:00.000Z"
}
```

The `user` relation is not eagerly loaded in the response.

---

#### `PATCH /infinity/players/:playerId/position`

Partially update a player's galaxy or planet coordinates.

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `playerId` | UUID string | `Player.id` |

**Request body** — all fields optional; only provided fields are updated.

| Field | Type | Description |
|-------|------|-------------|
| `galaxyX` | number | Galaxy-space X coordinate |
| `galaxyY` | number | Galaxy-space Y coordinate |
| `galaxyZ` | number | Galaxy-space Z coordinate |
| `currentPlanetId` | string | Active planet identifier |
| `planetX` | number | Surface X coordinate |
| `planetY` | number | Surface Y coordinate |

**Example request**

```http
PATCH /infinity/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890/position
Content-Type: application/json

{
  "galaxyX": 120.5,
  "galaxyY": -45.2,
  "galaxyZ": 10,
  "currentPlanetId": "system_alpha_planet_0",
  "planetX": 32,
  "planetY": 18
}
```

**Success response — 200 OK**

Returns the updated `Player` object (same shape as `GET /infinity/players/:userId`).

**Error responses**

| Status | Condition |
|--------|-----------|
| `404 Not Found` | `{ "statusCode": 404, "message": "Player <id> not found" }` |
| `400 Bad Request` | Invalid field types |

---

### Galaxy

The galaxy module exposes two models:

- **Cube-based galaxy** (new) — cubes and stars in MongoDB (`cubes`, `stars` collections), cached in **Redis** (TTL 2 minutes). Protected by JWT.
- **Legacy star systems** — procedural 2D star systems in MongoDB; public, unchanged.

See also: [objects/cube.md](./objects/cube.md), [objects/star.md](./objects/star.md), `documentation/galaxy/cube-based-star-system.md`, `documentation/specifications/galaxy-phase-4-api-design.md`.

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

#### Legacy star systems (public)

Star systems are stored in **MongoDB** (Mongoose). Systems are **generated on first access** if the `systemId` does not exist (deterministic from seed).

##### `GET /infinity/galaxy/systems/:systemId`

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `systemId` | string | Unique system identifier (used as MongoDB `_id` and generation seed) |

**Example request**

```http
GET /infinity/galaxy/systems/alpha-centauri
```

**Success response — 200 OK**

```json
{
  "_id": "alpha-centauri",
  "name": "Star System alpha-cen",
  "stars": [
    {
      "id": "alpha-centauri_star_0",
      "type": "yellow",
      "x": 50.12,
      "y": 3.45,
      "mass": 1.23,
      "temperature": 5800.5
    }
  ],
  "planets": [
    {
      "id": "alpha-centauri_planet_0",
      "name": "Planet 1",
      "x": 142.8,
      "y": 67.3,
      "radius": 8.4,
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

**Star types:** `yellow`, `red`, `blue`, `white`  
**Planet types:** `rocky`, `gas`, `ice`, `lava`

Planet count and layout are procedurally derived from `systemId`. The same `systemId` always yields the same system once persisted.

---

### Planets

Planet surface data is stored in **MongoDB**. Planets are **generated on first access** if the `planetId` does not exist.

#### `GET /infinity/planets/:planetId`

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `planetId` | string | Unique planet identifier (MongoDB `_id` and generation seed) |

**Example request**

```http
GET /infinity/planets/alpha-centauri_planet_0
```

**Success response — 200 OK**

```json
{
  "_id": "alpha-centauri_planet_0",
  "name": "Planet alpha-cen",
  "starSystemId": "unknown",
  "seed": "alpha-centauri_planet_0",
  "biomeTypes": ["grass", "ocean", "mountain", "desert"],
  "resources": {
    "iron": 3200,
    "gold": 890,
    "water": 7500,
    "crystal": 412
  },
  "heightMap": [[0.12, -0.05, ...], ...],
  "tileMap": [["grass", "water", ...], ...],
  "visited": true,
  "createdAt": "2026-06-07T12:00:00.000Z",
  "updatedAt": "2026-06-07T12:00:00.000Z"
}
```

| Field | Description |
|-------|-------------|
| `heightMap` | 64×64 grid of elevation values (Perlin noise, range roughly −1 to 1) |
| `tileMap` | 64×64 grid of tile types: `grass`, `sand`, `water`, `stone`, `snow`, `dirt` |
| `biomeTypes` | Derived biome labels: `grass`, `desert`, `forest`, `ocean`, `mountain`, `tundra` |
| `resources` | Aggregate resource quantities for the planet surface |

> **Note:** When a planet is generated via this endpoint alone, `starSystemId` defaults to `"unknown"`. Planets referenced inside a star system's `planets[]` array use IDs like `{systemId}_planet_{index}`.

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
GET /resources/planet/alpha-centauri_planet_0
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

Connect from a client:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', { transports: ['websocket'] });
```

### Events summary

| Direction | Event | Description |
|-----------|-------|-------------|
| Client → Server | `GALAXY_MOVE` | Player moved in galaxy space (position broadcast only) |
| Server → Client | `GALAXY_UPDATE` | Broadcast galaxy movement to all clients |
| Client → Server | `REQUEST_CUBE` | Request cube + stars for a **global** position |
| Server → Client | `CUBE_DATA` | Cube and stars payload (to requesting client) |
| Client → Server | `REQUEST_STAR` | Request star data by id |
| Server → Client | `STAR_DATA` | Star document (to requesting client) |
| Server → Client | `GALAXY_ERROR` | Error response for cube/star requests |
| Client → Server | `PLANET_MOVE` | Player moved on a planet surface |
| Server → Client | `PLANET_UPDATE` | Planet-room movement update |

Authentication is **not** enforced on WebSocket connections.

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

Notify the server of a position change in galaxy coordinates.

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Galaxy X |
| `y` | number | Galaxy Y |
| `z` | number | Galaxy Z |

**Example**

```javascript
socket.emit('GALAXY_MOVE', { x: 120.5, y: -45.2, z: 10 });
```

**Server behavior**

- Logs the movement (via `GalaxyService.handlePlayerMove`)
- Broadcasts `GALAXY_UPDATE` to **all** connected clients
- Does **not** load or emit cube data (use `REQUEST_CUBE` separately)

---

### `GALAXY_UPDATE` (server → client)

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | Socket.IO client id (not game `Player.id`) |
| `x` | number | Galaxy X |
| `y` | number | Galaxy Y |
| `z` | number | Galaxy Z |

```javascript
socket.on('GALAXY_UPDATE', (data) => {
  // { playerId: 'abc123', x: 120.5, y: -45.2, z: 10 }
});
```

---

### `PLANET_MOVE` (client → server)

Notify the server of movement on a planet surface. Clients should join the planet room (Socket.IO room named after `planetId`) to receive updates for that planet.

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `planetId` | string | Planet identifier (also used as room name) |
| `x` | number | Surface X |
| `y` | number | Surface Y |

**Example**

```javascript
socket.emit('join', planetId); // room join — not yet handled server-side
socket.emit('PLANET_MOVE', { planetId: 'alpha-centauri_planet_0', x: 32, y: 18 });
```

**Server behavior**

- Logs the movement (via `PlanetsService.handlePlayerMove`)
- Emits `PLANET_UPDATE` to the room `planetId` only

> **Gap:** The gateway does not currently handle a `join` message to add clients to planet rooms. Room membership must be set up before `PLANET_UPDATE` delivery works as intended.

---

### `PLANET_UPDATE` (server → client)

**Payload**

| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | Socket.IO client id |
| `planetId` | string | Planet identifier |
| `x` | number | Surface X |
| `y` | number | Surface Y |

```javascript
socket.on('PLANET_UPDATE', (data) => {
  // { playerId: 'abc123', planetId: 'alpha-centauri_planet_0', x: 32, y: 18 }
});
```

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
  REST-->>Client: { access_token }

  Client->>REST: GET /infinity/players/{userId}
  REST->>DB: Find or create Player
  REST-->>Client: Player profile

  Client->>REST: GET /infinity/cubes/{x}/{y}/{z} (Bearer token)
  REST->>DB: Find or generate Cube + Stars
  REST-->>Client: { cube, stars }

  Client->>REST: GET /infinity/galaxy/systems/{systemId}
  REST->>DB: Find or generate StarSystem
  REST-->>Client: Star system + planet list

  Client->>REST: GET /infinity/planets/{planetId}
  REST->>DB: Find or generate Planet
  REST-->>Client: Planet surface data

  Client->>WS: connect
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
| `documentation/stellar-gate-api.md` | Target auth contract for the StellarGate client (cookie-based JWT, `/infinity` prefix) |
| `documentation/galaxy/README.md` | Galaxy documentation index (design, naming, phase specs) |
| `documentation/specifications/galaxy-phase-4-api-design.md` | Phase 4 cube/star REST implementation spec |
| `AGENTS.md` | Module architecture, env vars, dev commands |
| `documentation/server-setup.md` | Deployment and infrastructure |

---

## Not implemented (out of scope for this reference)

- Cookie-based session auth
- `GET /infinity/coordinates/convert` (coordinate utility endpoint)
- JWT on WebSocket connections
- `CUBE_UPDATED` broadcasts (deferred until planets-on-star)
- REST endpoint for resource harvesting (`ResourcesService.harvest` is service-only)
- Redis-backed session or player position caching (Redis is used for cube cache only)
