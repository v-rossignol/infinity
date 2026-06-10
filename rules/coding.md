# Infinity Server Coding Rules

```yaml
date: 2026-06-10
author: Roro LeSage
model: Agent Infinity (Mistral Medium 3.5)
sources:
  - "user input"
  - "AGENTS.md"
```

## Purpose

`AGENTS.md` is the high-level project guide. This file contains detailed coding standards for implementation work in the Infinity Server codebase.

---

## 1. TypeScript

- Keep `strict` TypeScript compatibility. Do not introduce implicit `any`.
- Prefer explicit function parameter and return types for exported functions, public methods, services, controllers, and shared utilities.
- Avoid `any`. Use a precise type, `unknown`, or a generic when the value shape is not known yet.
- Use `interface` for stable object contracts and `type` for unions, mapped types, aliases, and composed utility types.
- Use `camelCase` for variables and functions, `PascalCase` for classes, interfaces, DTOs, schemas, and entities, and `UPPER_SNAKE_CASE` for constants.
- Keep functions small and focused. Extract shared behavior to `src/shared/` only when it is reusable across module boundaries.

---

## 2. Formatting and Style

- Use the repository ESLint and Prettier configuration as the source of truth.
- Keep file and directory names in kebab-case unless a framework convention or existing local pattern requires otherwise.
- Prefer `async`/`await` over raw Promise chains.
- Use early returns when they make control flow simpler.
- Do not add comments that repeat the code. Add short English comments only when they explain non-obvious decisions, algorithms, or domain rules.
- Code comments must be in English. Documentation files may remain in French.

---

## 3. NestJS Patterns

- Keep one domain feature per module inside `src/modules/`.
- Register new modules in `src/app.module.ts` when they are part of the application runtime.
- Use constructor injection for dependencies. Do not instantiate services manually with `new Service()`.
- Keep controllers thin: parse route inputs, delegate business logic to services, and return DTO-compatible responses.
- Put business rules in services or shared utilities, not controllers.
- Define request DTOs with `class-validator` decorators. The global `ValidationPipe` is already active.
- Read environment configuration through `ConfigService`; do not read `process.env` directly inside services.
- Use Nest's built-in `Logger` unless the project explicitly introduces another logging package.

---

## 4. Data Access

### PostgreSQL and TypeORM

- Put TypeORM entities in `src/modules/<module>/<name>.entity.ts`.
- Use TypeORM decorators such as `@Entity()`, `@Column()`, and relation decorators for persisted entities.
- Use injected repositories or existing data-access services for database operations.
- Do not enable TypeORM `synchronize: true` for production configuration.

### MongoDB and Mongoose

- Put Mongoose schemas in `src/modules/<module>/schemas/<name>.schema.ts`.
- Follow NestJS/Mongoose patterns: `@Schema()`, `@Prop()`, `SchemaFactory.createForClass()`, and injected models.
- Keep schema definitions aligned with the shared interfaces and API mappers that expose them.
- Do not use raw `model()` construction in application services when Nest dependency injection can provide the model.

### Redis

- Redis is currently implemented for galaxy cube caching through `RedisModule` and `RedisService`.
- Use the existing `RedisService` abstraction instead of creating direct `ioredis` clients in feature services.
- Cube cache entries store serialized `{ cube, stars }` payloads and use `GALAXY_CONSTANTS.CUBE_CACHE_TTL_SECONDS`.
- Session caching and real-time position caching are planned but not implemented yet.

---

## 5. API and Validation

- All REST routes are served under the `/infinity` prefix.
- Guard protected routes with `@UseGuards(JwtAuthGuard)` where authentication is required.
- Validate incoming request data with DTOs and `class-validator`.
- Keep response mapping explicit. Use mapper functions when database documents should not be returned directly.
- Throw NestJS HTTP exceptions for expected API errors such as missing resources, bad input, or forbidden access.

---

## 6. WebSockets

- Use Socket.IO through NestJS gateways.
- Add new socket events in `src/modules/socket/` and shared event types in `src/shared/interfaces/`.
- Keep event names consistent with existing constants and interfaces.
- Validate incoming socket payloads before applying movement or state changes.
- Avoid leaking sensitive player or authentication data in broadcast payloads.

---

## 7. Security

- Never commit `.env` files or secrets.
- Never expose `JWT_SECRET`, credentials, tokens, or connection strings in logs or API responses.
- Store passwords with the existing password hashing approach.
- Use guards and decorators for authorization checks when adding protected behavior.
- Keep CORS production hardening in mind when touching application bootstrap or deployment settings.

---

## 8. Testing

- Co-locate unit tests with source files using `*.spec.ts`.
- Use Jest and Nest testing utilities for services, controllers, gateways, and shared utilities.
- Mock external dependencies and database models in unit tests.
- Add or update focused tests for behavior changes, bug fixes, and shared utility changes.
- Run `npm test` before committing.
- Run E2E tests when changes affect `AppModule`, application bootstrap, global middleware, or cross-module API behavior.

---

## 9. Documentation

- Write project documentation in the `documentation/` directory as Markdown files.
- Add a YAML metadata block after the title for new documentation files.
- Include date, author, model name, model version, and sources in documentation metadata when applicable.
- Keep API documentation aligned with the implemented routes, DTOs, and socket events.
- Prefer updating `documentation/infinity-api.md` when request or response shapes change.

---

## 10. Dependencies and Maintenance

- Prefer existing project dependencies and framework utilities over adding new packages.
- Add a new dependency only when it materially simplifies the implementation or matches an established project direction.
- Keep dependency upgrades scoped and test them with the relevant test suite.
- Use `npm audit` or equivalent security tooling when dependency changes are part of the task.