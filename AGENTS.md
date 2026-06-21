# AGENTS.md — Infinity Server

Guidance for AI coding agents working on this repository.

**Monorepo context:** [../AGENTS.md](../AGENTS.md) · **Game rules:** [../contracts/game-rules.md](../contracts/game-rules.md) · **OpenAPI:** [auth](../contracts/auth-api.yaml) · [admin](../contracts/admin-api.yaml) · [game](../contracts/game-api.yaml) · **AsyncAPI:** [../contracts/asyncapi.yaml](../contracts/asyncapi.yaml) · **DTO schemas:** [../contracts/schemas/](../contracts/schemas/) · **Known gaps (user reference):** [../documentation/TO-BE-FIXED.md](../documentation/TO-BE-FIXED.md) · **Server deferred work (user reference):** [documentation/TO-BE-FIXED.md](documentation/TO-BE-FIXED.md)

---

## Project Overview

**Infinity** is a NestJS 11 multiplayer space-game backend written in TypeScript.  
It exposes a REST API and real-time Socket.IO events for clients to navigate a procedurally generated galaxy.

- **Author:** Roro LeSage  
- **Entry point:** `src/main.ts` (port `4000`, configurable via `PORT`)  
- **Package name:** `infinity-server`

---

## Architecture

### Module layout (`src/modules/`)

| Module | Description | Database |
|--------|-------------|----------|
| `auth` | Register/login, JWT strategy, `User` entity | PostgreSQL |
| `players` | Player profiles and positions | PostgreSQL |
| `galaxy` | Star-system generation and retrieval | MongoDB |
| `planets` | Planet generation and retrieval | MongoDB |
| `resources` | Planet resource data | MongoDB |
| `redis` | Redis client wrapper, cube cache | Redis |
| `socket` | Socket.IO gateway, adapter, real-time events | — |

### Data layer (polyglot)

| Store | Port | ORM/Client | Purpose |
|-------|------|------------|---------|
| PostgreSQL 16 | 5432 | TypeORM (`synchronize: true` in dev) | Structured user/player data |
| MongoDB 7 | 27017 | Mongoose | Galaxy, planets, resources |
| Redis 7 | 6379 | `ioredis` | Cube cache implemented; sessions / real-time positions planned |

### Shared utilities (`src/shared/`)

- `constants/` — game constants  
- `interfaces/` — TypeScript interfaces  
- `utils/` — math helpers and procedural generation (`noisejs` Perlin noise)

### Ops (`scripts/`)

- `scripts/` — server operational scripts (run from `infinity/` unless noted)
- Docker Compose and Dockerfile live in [`deployment/dev/docker/`](../../deployment/dev/docker/) at monorepo root

---

## Environment Setup

```bash
# 1. Start databases (from monorepo root)
docker compose -f deployment/dev/docker/docker-compose.yml up -d
# Or: deployment/dev/scripts/start-databases.ps1

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env   # fill in secrets

# 4. Start dev server (watch mode)
npm run start:dev
```

Required environment variables (see `.env.example`):

```
NODE_ENV, PORT
POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
MONGO_URI
REDIS_HOST, REDIS_PORT
JWT_SECRET
DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_EMAIL (optional)
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start server with file watcher |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled output |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier on `src/` and `test/` |

---

## Testing

Unit tests live **co-located** with source files (`*.spec.ts`).  
E2E tests live in `test/e2e/` and require running databases.

| Command | Scope |
|---------|-------|
| `npm test` | Unit tests |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:cov` | Coverage report → `coverage/` |
| `npm run test:e2e` | End-to-end tests (needs Docker databases) |
| `npm run test:e2e:docker` | E2E tests with `RUN_E2E=1` (Docker databases required) |

**Always run `npm test` before committing** to confirm unit tests pass.  
E2E tests are optional locally but should be verified before merging features that touch `AppModule`.

---

## Document Conventions

See [rules/documents.md](../../rules/documents.md) for detailed documentation standards and object-document conventions.

**Working directory:** Treat `documentation/` here and elsewhere in the monorepo as user-owned working directories. Do not read, search, or follow links into them unless the user explicitly references a path (e.g. `@infinity/documentation/objects/cube.md`). Use `../contracts/` and source code for implementation context.

When the user asks you to write or edit docs:

- Write project documentation in the `documentation/` directory as Markdown files
- Domain object specs (cube, star, star-system, planet): [documentation/objects/](documentation/objects/)
- Deprecated or superseded documents: [documentation/archive/](documentation/archive/)
- Deferred server issues: [documentation/TO-BE-FIXED.md](documentation/TO-BE-FIXED.md)
- Add metadata in a YAML block after the title
- Include date, author, model name, model version, and sources when applicable

--- 

## Coding Conventions

See [rules/coding.md](rules/coding.md) for detailed coding standards and best practices.

### NestJS patterns

- One **module** per domain feature inside `src/modules/`; register it in `app.module.ts`
- Use **constructor injection** (NestJS DI) — never `new Service()` directly
- Define **DTOs** with `class-validator` decorators; the global `ValidationPipe` is already active
- Mirror request/response DTO shapes in [../contracts/schemas/](../contracts/schemas/) (JSON Schema) when adding or changing payloads
- Mirror REST routes in the matching OpenAPI file ([auth-api.yaml](../contracts/auth-api.yaml), [admin-api.yaml](../contracts/admin-api.yaml), [game-api.yaml](../contracts/game-api.yaml)) and Socket.IO events in [asyncapi.yaml](../contracts/asyncapi.yaml)
- Use **`@nestjs/config`** (`ConfigService`) for all environment access — never `process.env` directly in services

### TypeScript

- `strict` mode is enabled; no implicit `any`
- Use `async/await`; avoid raw Promise chains
- Entity files follow the pattern `*.entity.ts` — TypeORM scans `modules/**/*.entity{.ts,.js}`

### Database

- **PostgreSQL** (TypeORM): entities in `src/modules/<name>/entities/*.entity.ts`
- **MongoDB** (Mongoose): schemas in `src/modules/<name>/entities/*.schema.ts`
- `synchronize: true` is active in dev — schema is auto-applied; do **not** enable in production
- **Redis** is wired for cube caching through `RedisModule` / `RedisService`; session and real-time position caching are not yet implemented

### Auth & security

- JWT authentication uses `@nestjs/passport` + `passport-jwt`
- Guard routes with `@UseGuards(JwtAuthGuard)` where needed
- CORS defaults to open (`CORS_ORIGIN` env, default `*`) — dev only; restrict before production deployment

### WebSocket events

Constants live in `src/modules/socket/events/`. Add new events there and in `src/shared/interfaces/` types.

**Galaxy** (`galaxy.events.ts`):

- Client → Server: `GALAXY_MOVE`, `REQUEST_CUBE`, `REQUEST_STAR`
- Server → Client: `GALAXY_UPDATE` (broadcast), `CUBE_DATA`, `STAR_DATA`, `GALAXY_ERROR`

**Planet** (`planet.events.ts`):

- Client → Server: `PLANET_MOVE`, `PLANET_JOIN`, `PLANET_LEAVE`
- Server → Client: `PLANET_UPDATE` (room per `planetId`), `PLANET_ERROR`

### Style

- Run `npm run lint` and `npm run format` before committing
- Keep functions small and focused; extract reusable logic to `src/shared/utils/`
- Comments in **English** for code; documentation files may remain in French

---

## REST API Surface

All routes are prefixed with **`/infinity`** (`src/main.ts`).

| Route | Method | Auth |
|-------|--------|------|
| `/infinity/health` | GET | public |
| `/infinity/auth/register` | POST | public |
| `/infinity/auth/login` | POST | public |
| `/infinity/admin/me` | GET | JWT + admin |
| `/infinity/admin/users` | GET | JWT + admin | List users (paginated: `?page=&count=`) |
| `/infinity/admin/planets` | GET | JWT + admin | List planets (paginated: `?page=&count=`) |
| `/infinity/admin/planets/generate` | GET | JWT + admin | Generate ephemeral preview planet surface (`?seed=&radius=&type=`) |
| `/infinity/admin/systems` | GET | JWT + admin | List star systems (paginated: `?page=&count=`) |
| `/infinity/admin/statistics` | GET | JWT + admin |
| `/infinity/admin/units/vehicules` | GET | JWT + admin | List vehicule unit types in catalog |
| `/infinity/admin/units/vehicules/:vehiculeId` | GET | JWT + admin | Get vehicule unit type by catalog id |
| `/infinity/players/me/enter-game` | POST | JWT |
| `/infinity/players/:userId` | GET | public |
| `/infinity/players/:userId` | GET | public |
| `/infinity/players/me/location` | PATCH | JWT |
| `/infinity/players/me/location/*` | POST/PATCH | JWT (transitions + depth moves) |
| `/infinity/players/me/location/planet` | PATCH | JWT | Select or update hex at planet depth |
| `/infinity/players/me/can-enter/cube/:cubeId` | GET | JWT |
| `/infinity/players/me/can-enter/system/:starSystemId` | GET | JWT |
| `/infinity/players/me/can-enter/planet/:planetId` | GET | JWT |
| `/infinity/cubes/:x/:y/:z` | GET | JWT |
| `/infinity/cubes/:x/:y/:z/stars` | GET | JWT |
| `/infinity/cubes/by-name/:name` | GET | JWT |
| `/infinity/stars/:id` | GET | JWT |
| `/infinity/stars?cube_id={uuid}` | GET | JWT |
| `/infinity/galaxy/systems/:systemId` | GET | JWT |
| `/infinity/planets/:planetId` | GET | public |
| `/infinity/resources/planet/:planetId/hex/:q/:r` | GET | public |
| `/infinity/resources/planet/:planetId` | GET | public |

REST OpenAPI: [auth-api.yaml](../contracts/auth-api.yaml), [admin-api.yaml](../contracts/admin-api.yaml), [game-api.yaml](../contracts/game-api.yaml). Socket.IO AsyncAPI: [asyncapi.yaml](../contracts/asyncapi.yaml). DTO JSON Schemas: [../contracts/schemas/](../contracts/schemas/). **API source of truth:** [../contracts/](../contracts/).

---

## Important Constraints

- **Do not read `documentation/` proactively** — applies to this project's `documentation/` and every other `documentation/` directory in the monorepo unless the user cites an explicit path
- Never create a git commit unless the user explicitly asks for it
- Do **not** commit `.env` — only `.env.example`
- Do **not** enable `synchronize: true` in production TypeORM config
- Do **not** expose `JWT_SECRET` in logs or responses
- Redis integration is **partial** — cube cache is wired; session caching is not yet implemented
- `deployment/dev/docker/docker-compose.yml` starts databases only, **not** the NestJS app