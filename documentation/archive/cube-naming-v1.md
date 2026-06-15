# Cube Naming

```yaml
date: 2026-06-14
author: Roro LeSage
model: Composer
sources:
  - src/shared/utils/cube-naming.ts
  - src/shared/utils/galaxy.ts
  - documentation/galaxy/cube-naming-specification.md
  - documentation/objects/cube.md
```

## Overview

> **Superseded** by the pronounceable v2 scheme in [cube-naming-specification.md](../galaxy/cube-naming-specification.md). Kept for historical reference.

Each cube has a short, deterministic **`name`** derived from its center coordinates **`origin`** `(x, y, z)`. The same coordinates always produce the same name.

---

## How names are generated

1. Format the cube center as a string: `"x,y,z"` (no spaces).
   - Example: `(10, -10, 0)` → `"10,-10,0"`.
2. Compute a **CRC32** hash of that string.
3. Encode the hash in **lowercase base36** (`0-9`, `a-z`).

The result is typically 6–8 characters, for example `kikyhk` or `1elvszz`.

---

## Examples

| Coordinates `(x, y, z)` | Input string | Name |
| ----------------------- | ------------ | ---- |
| `(0, 0, 0)` | `"0,0,0"` | `1elvszz` |
| `(10, 10, 10)` | `"10,10,10"` | `kikyhk` |
| `(10, -10, 0)` | `"10,-10,0"` | `1gqdbp2` |

---

## Collision handling

If a generated name is already taken by another cube (extremely unlikely), the server rehashes with a salt (`:1`, `:2`, …) appended to the input until a free name is found.

---

## Star names

Stars inside a cube use the cube name as a suffix: **`{Greek letter} {cube name}`**.

Examples: `Alpha kikyhk`, `Beta 1elvszz`.

---

## Related documents

- [cube-naming-specification.md](../galaxy/cube-naming-specification.md) — full specification with implementation details
- [cube.md](../objects/cube.md) — cube object reference
- [cube-based-star-system.md](../galaxy/cube-based-star-system.md) — cube layout and star naming
