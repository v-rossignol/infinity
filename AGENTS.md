# AGENTS.md — Infinity Server

Guidance for AI coding agents working on this repository.

---

## Project Overview

**Infinity** is a NestJS 10 multiplayer space-game backend written in TypeScript.  
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
| `socket` | Socket.IO gateway, adapter, real-time events | — |

### Data layer (polyglot)

| Store | Port | ORM/Client | Purpose |
|-------|------|------------|---------|
| PostgreSQL 16 | 5432 | TypeORM (`synchronize: true` in dev) | Structured user/player data |
| MongoDB 7 | 27017 | Mongoose | Galaxy, planets, resources |
| Redis 7 | 6379 | `ioredis` (configured, not yet implemented) | Intended for sessions / real-time positions |

### Shared utilities (`src/shared/`)

- `constants/` — game constants  
- `interfaces/` — TypeScript interfaces  
- `utils/` — math helpers and procedural generation (`noisejs` Perlin noise)

### Ops (`docker/`, `scripts/`)

- `docker/` — Dockerfile and Compose for local databases and app image  
- `scripts/` — deployment and operational scripts (run from project root)

---

## Environment Setup

```bash
# 1. Start databases
docker compose -f docker/docker-compose.yml up -d

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

**Always run `npm test` before committing** to confirm unit tests pass.  
E2E tests are optional locally but should be verified before merging features that touch `AppModule`.

---

## Coding Conventions

### NestJS patterns

- One **module** per domain feature inside `src/modules/`; register it in `app.module.ts`
- Use **constructor injection** (NestJS DI) — never `new Service()` directly
- Define **DTOs** with `class-validator` decorators; the global `ValidationPipe` is already active
- Use **`@nestjs/config`** (`ConfigService`) for all environment access — never `process.env` directly in services

### TypeScript

- `strict` mode is enabled; no implicit `any`
- Use `async/await`; avoid raw Promise chains
- Entity files follow the pattern `*.entity.ts` — TypeORM scans `modules/**/*.entity{.ts,.js}`

### Database

- **PostgreSQL** (TypeORM): entities in `src/modules/<name>/<name>.entity.ts`
- **MongoDB** (Mongoose): schemas in `src/modules/<name>/schemas/<name>.schema.ts`
- `synchronize: true` is active in dev — schema is auto-applied; do **not** enable in production
- **Redis** is provisioned but not yet wired into services; implement caching/session modules there when needed

### Auth & security

- JWT authentication uses `@nestjs/passport` + `passport-jwt`
- Guard routes with `@UseGuards(JwtAuthGuard)` where needed
- CORS is currently open (`origin: '*'`) — dev only; restrict before production deployment

### WebSocket events

- Client → Server: `GALAXY_MOVE`, `PLANET_MOVE`
- Server → Client: `GALAXY_UPDATE` (broadcast), `PLANET_UPDATE` (room per `planetId`)
- Add new events to `src/modules/socket/` and the shared `src/shared/interfaces/` types

### Style

- Run `npm run lint` and `npm run format` before committing
- Keep functions small and focused; extract reusable logic to `src/shared/utils/`
- Comments in **English** for code; documentation files may remain in French

---

## REST API Surface

| Route | Method | Auth |
|-------|--------|------|
| `/auth/register` | POST | public |
| `/auth/login` | POST | public |
| `/players/:userId` | GET | — |
| `/players/:playerId/position` | PATCH | — |
| `/galaxy/systems/:systemId` | GET | — |
| `/planets/:planetId` | GET | — |
| `/resources/planet/:planetId` | GET | — |

---

## Important Constraints

- Do **not** commit `.env` — only `.env.example`
- Do **not** enable `synchronize: true` in production TypeORM config
- Do **not** expose `JWT_SECRET` in logs or responses
- Redis integration is **incomplete** — don't assume it works end-to-end yet
- The `docker/docker-compose.yml` starts databases only, **not** the NestJS app
