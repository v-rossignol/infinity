# Infinity Server Documentation Rules

```yaml
date: 2026-06-10
author: Roro LeSage
model: Agent Infinity (Mistral Medium 3.5)
sources:
  - documentation/objects/cube.md
  - documentation/objects/star.md
  - AGENTS.md
```

## Purpose

This document defines the writing conventions for project documentation in `documentation/`. Use `AGENTS.md` as the high-level project guide and this file as the detailed documentation standard.

---

## 1. Location and Format

- Write project documentation as Markdown files in `documentation/`.
- Use lowercase kebab-case filenames, for example `cube-based-star-system.md`.
- Keep object documentation in `documentation/objects/`.
- Keep API-level documentation in `documentation/infinity-api.md` unless a feature needs a dedicated supporting document.
- Use relative links between documentation files.

---

## 2. Required Header

Start each document with a single H1 title, followed by a YAML metadata block.

~~~markdown
# Document Title

```yaml
date: 2026-06-10
author: Roro LeSage
model: Composer
sources:
  - src/path/to/source.ts
  - documentation/path/to/source.md
```
~~~

Metadata rules:

- `date` uses `YYYY-MM-DD`.
- `author` should be the document author.
- `model` should identify the AI model or authoring tool when AI-assisted.
- `sources` should list the code, schemas, interfaces, specifications, or documents used as source of truth.

---

## 3. Object Document Structure

Use this structure for object/domain documents such as `cube.md` and `star.md`:

1. `## Overview`
2. `## Identity`
3. `## Fields`
4. `## API representation`
5. `## MongoDB document` or another storage-specific section
6. `## Relationships`
7. `## Generation rules` when the object is generated procedurally
8. `## Related endpoints`
9. `## Related documents`

Add or remove sections only when they do not apply to the documented object.

---

## 4. Content Style

- Prefer concise, factual descriptions grounded in implemented code.
- Use bold text for important domain terms and invariants.
- Use inline code for field names, collection names, constants, event names, routes, and payload keys.
- Use tables for structured field lists, indexes, endpoints, examples, and event maps.
- Use JSON code blocks for API and database payload examples.
- Use Mermaid diagrams when they clarify relationships.
- Separate major sections with `---`.
- Documentation may be written in French or English, but keep each document internally consistent.

---

## 5. Source of Truth

- Treat implemented code as the source of truth for behavior.
- Prefer interfaces, schemas, DTOs, controllers, services, constants, and tests over older planning documents.
- When code and documentation disagree, update documentation to match code unless the task is explicitly to change behavior.
- Do not document future behavior as implemented. Mark future behavior as planned or pending.

---

## 6. API and Event Documentation

- Include the route method, path, authentication requirement, and behavior for related endpoints.
- Keep route paths aligned with the `/infinity` prefix.
- Include Socket.IO event direction and payload shape when applicable.
- Link to `documentation/infinity-api.md` for full request and response details.
- Update `documentation/infinity-api.md` when request payloads, response payloads, or socket events change.

---

## 7. Examples

- Keep examples realistic and consistent with current schemas.
- Use UUID-like strings for persisted IDs.
- Use the same field names exposed by the API, for example `id` instead of MongoDB `_id` in API examples.
- Use MongoDB `_id` only in storage examples.
- Avoid ellipses in full examples unless the omitted structure is shown nearby or intentionally summarized.

---

## 8. Related Documents

- End each object document with a `## Related documents` section.
- Link to parent, child, API, and specification documents that help readers continue from the current page.
- Keep link labels short and descriptive.
