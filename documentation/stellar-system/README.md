# Stellar System Documentation

```yaml
date: 2026-06-10
author: Roro LeSage
model: Composer
sources:
  - documentation/stellar-system/stellar-system-summary.md
  - documentation/objects/star.md
  - documentation/objects/star-system.md
```

## Purpose

Documentation for the **stellar system**: a **separate**, **on-demand** layer when a player enters a cube **Star**. **Stars stay in the cube** (lightweight galaxy-map structure); the stellar system is **created on first GET** and **returned on later GETs**.

---

## Documents

| Document | Role |
|----------|------|
| [star-system.md](../objects/star-system.md) | Object reference — fields, lifecycle, generation, endpoints |
| [stellar-system-summary.md](./stellar-system-summary.md) | Domain reference — intended model, legacy behavior, generation rules |
| [development-plan.md](./development-plan.md) | Implementation status, migration priorities, test plan |
| [code-alignment-audit.md](./code-alignment-audit.md) | Gap matrix — intended model vs legacy code vs docs |

---

## Quick reference

| Concept | Rule |
|---------|------|
| **Cube** | Keeps **lightweight stars** only (5–20 per cube). Stars are **not removed** when a player enters one. See [cube.md](../objects/cube.md). |
| **Star** | Galaxy-map document in `stars` (`cube_id`, `local_coords`, `properties`). Loaded with the cube. **Must exist** before a stellar system can be created. |
| **Star system** | **On demand:** `GET` returns existing `StarSystem` or **creates** one on first access. **`StarSystem._id` = `Star.id`**, **`StarSystem.name` = `Star.name`**. |
| **Two layers** | **Cube + stars** = map view. **StarSystem** = inner view (planets). Same star UUID; different documents and endpoints. |
| **Route** | `GET /infinity/galaxy/systems/:systemId` — JWT; star UUID; **404** if star missing; generate + persist on first miss |
| **Planets** | Summaries in `StarSystem.planets[]`; details via `GET /infinity/planets/:planetId?systemId={starId}` |

---

## Related documents

- [Star object](../objects/star.md)
- [Star system object](../objects/star-system.md)
- [Cube object](../objects/cube.md)
- [Infinity API](../infinity-api.md)
