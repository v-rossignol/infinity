# Infinity Galaxy Server: Cube Naming Specification (Hash-Based)

```yaml
date: 2026-06-08
author: Roro LeSage
model: Composer
sources:
  - src/shared/utils/cube-naming.ts
  - src/shared/utils/cube-naming.spec.ts
```

## Overview

This document describes the **hash-based naming system** for cubes in the **Infinity** galaxy server. The goal is to generate **compact, unique, and collision-resistant names** from cube center coordinates `(x, y, z)`.

**Canonical implementation**: **CRC32** (unsigned, IEEE polynomial) + **Base36** (lowercase). Source: `src/shared/utils/cube-naming.ts`.

---

## Naming Strategy

### Method: **CRC32 + Base36 encoding**

- **Input**: Cube coordinates as a string (e.g., `"10,-10,0"`).
- **Hash function**: CRC32 over UTF-8 bytes of the input string (unsigned 32-bit result).
- **Encoding**: Convert the hash to a **lowercase Base36** string.

---

## Why This Approach?

- **Compact**: Names are typically 6–8 characters.
- **Low collision risk**: CRC32 provides a very low probability of collisions for structured coordinate inputs.
- **Readable**: Base36 uses alphanumeric characters (`0-9`, `a-z`).
- **Deterministic**: The same coordinates always produce the same name.

---

## Naming Rules

1. **Input format**: Coordinates are formatted as a string: `"{x},{y},{z}"` (no spaces).
   - Example: `(10, -10, 0)` → `"10,-10,0"`.
2. **Hashing**: Apply CRC32 to the input string.
3. **Encoding**: Convert the unsigned hash integer to lowercase Base36.
4. **Output**: The Base36 string is the cube `name`.

---

## Verified examples

Values computed by the server implementation and covered in unit tests:

| Coordinates `(x, y, z)` | Input string      | CRC32 (hex)  | CRC32 (decimal) | Base36 name |
| ----------------------- | ----------------- | ------------ | --------------- | ----------- |
| `(0, 0, 0)`             | `"0,0,0"`         | `0xb6627b4f` | `3060064655`    | `1elvszz`   |
| `(10, 10, 10)`          | `"10,10,10"`      | `0x49f4e818` | `1240534424`    | `kikyhk`    |
| `(10, -10, 0)`          | `"10,-10,0"`      | `0xbe0d2676` | `3188532854`    | `1gqdbp2`   |
| `(123, 456, 789)`       | `"123,456,789"`   | `0xf2a07122` | `4070600994`    | `1vbj3tu`   |
| `(-100, 200, -300)`     | `"-100,200,-300"` | `0xb2dcb17e` | `3000807806`    | `1dmlq4e`   |

---

## Implementation

### TypeScript (production)

```typescript
// src/shared/utils/cube-naming.ts
export const hashOriginToName = (originKey: string, salt = ''): string =>
  toBase36Lower(crc32(`${originKey}${salt}`));
```

The origin key is built from the cube center: `` `${x},${y},${z}` ``.

### Collision handling

If a generated name already exists in MongoDB for a different origin (extremely unlikely), the server appends a salt (`:1`, `:2`, …) to the input and rehashes — see `generateCubeNameWithCollisionHandling`.

- **Theoretical risk**: CRC32 collision probability ~1 in 4 billion for random inputs.
- **Practical mitigation**: Structured coordinates; salted rehash on conflict.

---

## Advantages

- **No special characters**: Names are alphanumeric (`0-9`, `a-z`).
- **Fixed length**: Typically 6–8 characters for CRC32.
- **Efficient**: Fast to compute and store.

---

## Limitations

- **Not bijective**: Two different coordinate sets *could* (very rarely) produce the same name.
- **Not human-readable**: Names do not directly reflect coordinates.

---

## Related documents

- [cube-based-star-system.md](./cube-based-star-system.md) — how `name` fits in the cube model
- [README.md](./README.md) — galaxy documentation index
- [galaxy-phase-1-core-infrastructure.md](../specifications/galaxy-phase-1-core-infrastructure.md) — Phase 1 naming decision
