# Infinity Server Coding Rules

```yaml
date: 2026-06-10  
author: Roro LeSage  
model: GPT-5.5  
sources:
- "user input"
```

## Overview

This document defines coding rules for the **Infinity Server** codebase. The repository is the source of truth: when this document and the implementation disagree, update this document or the implementation so they match.

---

## 1. Platform and Tooling

### 1.1 Runtime and Framework

- Use **TypeScript** for application code.
- Use **NestJS 11** patterns and APIs.
- Use **Node.js 20**.
- Compile to **CommonJS** with `target: ES2021`, as configured in `tsconfig.json`.

### 1.2 Formatting and Linting

- Use **Prettier** for formatting.
- Use **ESLint** with the repository configuration in `.eslintrc.js`.
- Do not introduce style rules from external guides unless they are added to the local ESLint configuration.
- Run `npm run lint` and `npm run format` before committing when practical.

### 1.3 TypeScript Strictness

- Respect the strict options currently enabled in `tsconfig.json`, especially `strictNullChecks`, `noImplicitAny`, and `forceConsistentCasingInFileNames`.
- Prefer concrete types over `any`. If a value is genuinely unknown, prefer `unknown` and narrow it before use.
- Explicit return types are encouraged for public APIs, exported helpers, and complex functions, but local inference is acceptable when it improves readability.
- Use `interface` for stable object contracts and `type` for unions, mapped types, aliases, or composed shapes.

---

## 2. Project Structure

### 2.1 Source Layout

- Keep application code under `src/`.
- Keep domain features under `src/modules/<domain>/`.
- Keep shared constants, interfaces, and utilities under `src/shared/`.
- Keep application configuration under `src/config/`.
- Keep operational scripts under `scripts/` and Docker files under `docker/`.

### 2.2 Naming

- Use `kebab-case` for file and directory names where the existing code does so.
- Use NestJS suffixes consistently:
  - `*.module.ts`
  - `*.controller.ts`
  - `*.service.ts`
  - `*.gateway.ts`
  - `*.entity.ts`
  - `*.schema.ts`
  - `*.dto.ts`
  - `*.spec.ts`
- Use `PascalCase` for classes, entities, schemas, DTOs, modules, controllers, services, and gateways.
- Use `camelCase` for variables, functions, methods, and class members.
- Do not prefix private class members with `_` unless a local file already uses that convention.

---

## 3. NestJS Patterns

### 3.1 Modules

- Keep one Nest module per domain feature when possible.
- Register feature modules through `src/app.module.ts`.
- Export providers only when another module needs them.
- Avoid lazy-loading language unless it is implemented in the codebase for a specific module.

### 3.2 Dependency Injection

- Use constructor injection for services, repositories, models, configuration, and adapters.
- Do not instantiate Nest services manually with `new Service()`.
- Keep providers focused on one responsibility.

### 3.3 Controllers

- Keep controllers thin.
- Put request parsing, guards, route decorators, and response orchestration in controllers.
- Put business logic in services.
- Use DTOs with `class-validator` decorators for request bodies and query parameters when validation is needed.

### 3.4 Services

- Keep services responsible for domain logic and persistence coordination.
- Prefer `async`/`await` over raw Promise chains.
- Avoid hidden global state and hardcoded dependencies.
- Use `ConfigService` or config modules for environment-derived values in services.

---

## 4. Data Access

### 4.1 PostgreSQL and TypeORM

- Use **TypeORM** for PostgreSQL-backed structured data.
- Store TypeORM entities under `src/modules/<domain>/entities/*.entity.ts`.
- Define entities with `@Entity()` and fields with TypeORM decorators such as `@Column()`.
- Inject repositories with `@InjectRepository(Entity)`.
- Do not enable production schema synchronization. `synchronize: true` is acceptable only for local development configuration.

### 4.2 MongoDB and Mongoose

- Use **Nest Mongoose** for MongoDB-backed game data.
- Store Mongoose schema classes under the current repository pattern: `src/modules/<domain>/entities/*.schema.ts`.
- Define schemas with `@Schema()`, fields with `@Prop()`, and create schemas with `SchemaFactory.createForClass()`.
- Use `HydratedDocument<T>` for Mongoose document types.
- Inject models through Nest Mongoose APIs instead of importing raw `model()` definitions.

### 4.3 Redis

- Use the existing `RedisModule` and `RedisService` for Redis access.
- Redis is currently used for cube caching. Do not assume session storage or real-time position caching exists unless it has been implemented.
- Use explicit TTLs for cache entries that should expire.

---

## 5. API and Real-Time Events

### 5.1 REST API

- All REST routes are served under the `/infinity` prefix.
- Keep route names consistent with the existing API surface documented in `documentation/infinity-api.md`.
- Protect routes with `JwtAuthGuard` when authentication is required.
- Return stable response shapes for existing public endpoints.

### 5.2 Socket.IO

- Use **Socket.IO** through Nest WebSocket gateways.
- Add or update Socket.IO behavior in `src/modules/socket/`.
- Keep event names aligned with shared interfaces and constants.
- Existing client-to-server events include `GALAXY_MOVE` and `PLANET_MOVE`.
- Existing server-to-client events include `GALAXY_UPDATE` and `PLANET_UPDATE`.

---

## 6. Error Handling and Logging

### 6.1 Errors

- Use NestJS HTTP exceptions for expected HTTP failures.
- Throw domain-appropriate exceptions close to where the invalid condition is detected.
- Avoid swallowing errors silently.
- Preserve useful error context without exposing secrets or sensitive values.

### 6.2 Logging

- Use NestJS-compatible logging patterns already present in the codebase.
- Do not add a new logging library unless the project adopts it intentionally.
- Never log `JWT_SECRET`, passwords, tokens, database credentials, or raw `.env` contents.

---

## 7. Security

### 7.1 Authentication

- Use the existing JWT authentication stack based on `@nestjs/passport`, `passport-jwt`, and `@nestjs/jwt`.
- Hash passwords with `bcrypt` before persistence.
- Do not return password hashes from API responses.

### 7.2 Configuration

- Use `.env` for local environment-specific configuration.
- Keep `.env.example` safe to commit.
- Never commit real `.env` files or production secrets.
- Do not read `process.env` directly in domain services; use the configuration layer.

### 7.3 Validation

- Validate incoming data with DTOs and `class-validator` where request input crosses an API boundary.
- Prefer whitelisted, explicit DTO fields over accepting arbitrary payloads.
- Sanitize or constrain user-controlled values that are used in database queries or logs.

---

## 8. Testing

### 8.1 Unit Tests

- Use **Jest** for unit tests.
- Keep unit tests co-located with source files as `*.spec.ts`.
- Mock external services, repositories, Redis, and Mongoose models when testing isolated logic.
- Run `npm test` before committing when practical.

### 8.2 E2E Tests

- Keep end-to-end tests under `test/e2e/`.
- Use the repository e2e Jest configuration.
- E2E tests may require Docker-managed PostgreSQL, MongoDB, and Redis services.
- Run e2e tests before merging changes that affect `AppModule`, database configuration, authentication, or public API contracts.

---

## 9. Performance and Maintainability

### 9.1 Performance

- Use pagination or bounded queries for large result sets.
- Avoid avoidable N+1 query patterns.
- Cache expensive or frequently reused data through existing Redis infrastructure when it is safe to do so.
- Keep procedural generation deterministic where deterministic behavior is part of the game contract.

### 9.2 Maintainability

- Keep functions small and focused.
- Extract shared math, generation logic, and type contracts to `src/shared/` when reused across modules.
- Prefer straightforward code over new abstractions unless the abstraction removes real duplication or clarifies domain behavior.
- Add concise comments only when they explain non-obvious intent or constraints.

---

## 10. Documentation

- Write project documentation in `documentation/`.
- Follow the documentation conventions in `rules/documents.md`.
- Keep API documentation aligned with implemented routes and Socket.IO events.
- Do not claim Swagger/OpenAPI support unless it is added to the project.

---

## 11. Dependencies

- Add dependencies only when they solve a clear project need.
- Prefer existing NestJS, TypeORM, Mongoose, Redis, and shared utility patterns before adding new libraries.
- Use `npm install` to update dependency metadata instead of editing lockfiles by hand.
- Review security implications before adding authentication, cryptography, database, or network-facing packages.

---

## 12. Review and Updates

- Update this document when the codebase changes its architecture, framework version, linting rules, persistence patterns, or API conventions.
- Keep this document specific to Infinity Server. Avoid generic best-practice requirements that are not implemented or planned in this repository.

