# Infinity Server — Admin API

```yaml
date: 2026-06-12
author: Roro LeSage
model: Composer
type: API Reference
sources:
  - src/modules/admin/
  - src/modules/auth/auth.service.ts
  - src/modules/auth/guards/admin.guard.ts
  - src/modules/auth/guards/jwt-auth.guard.ts
  - src/modules/auth/constants/user-role.ts
  - src/modules/auth/entities/user.entity.ts
  - src/main.ts
  - .env.example
  - AGENTS.md
```

Reference for **implemented** admin HTTP routes on the Infinity NestJS server. All routes under `/infinity/admin/*` require a valid JWT **and** the **admin** role.

For general REST and WebSocket behavior, see [infinity-api.md](./infinity-api.md).

---

## Base URL

| Environment | URL |
|-------------|-----|
| Local development | `http://localhost:4000/infinity` |

Port is configurable via the `PORT` environment variable (default `4000`).

### Route prefix

Admin routes are mounted at **`/infinity/admin/*`**. The global prefix `/infinity` is set in `src/main.ts`.

---

## Authentication

### Requirements

| Layer | Guard | Behavior |
|-------|-------|----------|
| JWT | `JwtAuthGuard` | Validates `Authorization: Bearer <access_token>` |
| Admin role | `AdminGuard` | Requires `role: "admin"` on the authenticated user |

Both guards are applied at the controller level on `AdminController`, so every route under `/infinity/admin/*` inherits them.

### Obtaining an admin token

1. Configure default admin credentials in `.env` (see [Default admin bootstrap](#default-admin-bootstrap)).
2. Start the server so the default admin account is created if it does not exist.
3. Log in with `POST /infinity/auth/login` using admin credentials.
4. Use the returned `access_token` on admin requests.

**Login request**

```
POST /infinity/auth/login
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "change-me-in-production"
}
```

**Login response — 200 OK**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

The JWT payload includes `sub` (user id), `username`, and `role`. Tokens issued before the `role` field was added will not pass `AdminGuard`.

### Authorization errors

| Code | Cause |
|------|-------|
| `401 Unauthorized` | Missing, invalid, or expired JWT |
| `403 Forbidden` | Valid JWT but `role` is not `admin` |

**Forbidden example — 403**

```json
{
  "statusCode": 403,
  "message": "Admin access required",
  "error": "Forbidden"
}
```

---

## Default admin bootstrap

On server startup, `AuthService.ensureDefaultAdmin()` creates the default admin account when:

- `DEFAULT_ADMIN_PASSWORD` is set, and
- no user with `DEFAULT_ADMIN_USERNAME` exists yet.

If `DEFAULT_ADMIN_PASSWORD` is missing, bootstrap is skipped and a warning is logged. Restarting the server does **not** reset an existing admin password.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFAULT_ADMIN_USERNAME` | No | `admin` | Username for the bootstrap admin account |
| `DEFAULT_ADMIN_PASSWORD` | Yes (for bootstrap) | — | Password for the bootstrap admin account |
| `DEFAULT_ADMIN_EMAIL` | No | `""` | Email stored on the admin user |

Public registration (`POST /infinity/auth/register`) always creates users with `role: "user"`. Admin accounts cannot be created through the public register endpoint.

### User roles

| Role | Value | Description |
|------|-------|-------------|
| User | `user` | Default role for registered accounts |
| Admin | `admin` | Required for `/infinity/admin/*` routes |

Defined in `src/modules/auth/constants/user-role.ts`.

---

## REST endpoints

### Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/infinity/admin/me` | JWT + admin | Current admin profile |
| `GET` | `/infinity/admin/users` | JWT + admin | List all users |
| `GET` | `/infinity/admin/statistics` | JWT + admin | Entity counts across databases |

---

### `GET /infinity/admin/me`

Returns the authenticated admin user profile. Password is never included.

**Request**

```
GET /infinity/admin/me
Authorization: Bearer <access_token>
```

**Success response — 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "createdAt": "2026-06-12T10:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | User id (`User.id`) |
| `username` | string | Username |
| `email` | string | Email address, or `""` if not set |
| `role` | string | Always `admin` for this endpoint |
| `createdAt` | string (ISO 8601) | Account creation timestamp |

**Errors**

| Code | Cause |
|------|-------|
| `401` | Missing or invalid JWT |
| `403` | JWT user is not an admin |
| `404` | Authenticated user id not found in database |

---

### `GET /infinity/admin/users`

Lists all users ordered by `createdAt` ascending. Passwords are never returned.

**Request**

```
GET /infinity/admin/users
Authorization: Bearer <access_token>
```

**Success response — 200 OK**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2026-06-12T10:00:00.000Z"
  },
  {
    "id": "661f9511-f39c-52e5-b827-557766551111",
    "username": "pilot42",
    "email": "pilot@example.com",
    "role": "user",
    "createdAt": "2026-06-12T11:30:00.000Z"
  }
]
```

Each array item matches the `GET /infinity/admin/me` response shape.

**Errors**

| Code | Cause |
|------|-------|
| `401` | Missing or invalid JWT |
| `403` | JWT user is not an admin |

---

### `GET /infinity/admin/statistics`

Returns document counts across PostgreSQL and MongoDB. Counts are fetched in parallel.

**Request**

```
GET /infinity/admin/statistics
Authorization: Bearer <access_token>
```

**Success response — 200 OK**

```json
{
  "users": 3,
  "cubes": 12,
  "starSystems": 8,
  "planets": 24
}
```

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `users` | number | PostgreSQL `User` table | Registered accounts (all roles) |
| `cubes` | number | MongoDB `cubes` collection | Persisted galaxy cubes |
| `starSystems` | number | MongoDB `starsystems` collection | Persisted star systems |
| `planets` | number | MongoDB `planets` collection | Persisted planet surface documents |

**Errors**

| Code | Cause |
|------|-------|
| `401` | Missing or invalid JWT |
| `403` | JWT user is not an admin |

---

## Related documents

| Document | Description |
|----------|-------------|
| [infinity-api.md](./infinity-api.md) | General REST and WebSocket API reference |
| [server-setup.md](./server-setup.md) | Module architecture and deployment |
| [AGENTS.md](../AGENTS.md) | Agent guide — env vars, modules, dev commands |
| [objects/cube.md](./objects/cube.md) | Cube object — MongoDB `cubes` collection |
| [objects/star-system.md](./objects/star-system.md) | Star system object — MongoDB `starsystems` collection |
| [objects/planet.md](./objects/planet.md) | Planet object — MongoDB `planets` collection |
