# Infinity Galaxy Server: Cube Naming Specification (Pronounceable v2)

```yaml
date: 2026-06-14
author: Roro LeSage
model: Composer
sources:
  - src/shared/utils/cube-naming.ts
  - src/shared/utils/cube-naming.spec.ts
  - documentation/cubes/code-naming-v2.js
```

## Overview

This document describes the **pronounceable naming system** for cubes in the **Infinity** galaxy server. The goal is to generate **deterministic, unique, human-readable names** from cube center coordinates `(x, y, z)`.

**Canonical implementation**: **CRC32** (unsigned, IEEE polynomial) mapped to **three CVC syllables**. Source: `src/shared/utils/cube-naming.ts`.

---

## Naming Strategy

### Method: **CRC32 + CVC syllables**

- **Input**: Cube coordinates as a string (e.g. `"10,-10,0"`).
- **Hash function**: CRC32 over UTF-8 bytes of the input string (unsigned 32-bit result).
- **Encoding**: Split the hash into four bytes and map each to consonant/vowel arrays to build three syllables.
- **Output format**: `"Xxx Xxx Xxx"` — title case, space-separated (e.g. `Ces Luf Top`).

---

## Why This Approach?

- **Pronounceable**: Names sound like words rather than opaque hashes.
- **Deterministic**: The same coordinates always produce the same name.
- **Collision handling**: Salted rehash (`:1`, `:2`, …) still applies when a name is already taken.

---

## Naming Rules

1. **Input format**: Coordinates are formatted as a string: `"{x},{y},{z}"` (no spaces).
   - Example: `(10, -10, 0)` → `"10,-10,0"`.
2. **Hashing**: Apply CRC32 to the input string.
3. **Syllables**: Use hash bytes `b0..b3` to pick consonants and vowels:
   - Syllable 1: `C[b0] + V[b1] + C[b2]`
   - Syllable 2: `C[b3] + V[b0+b1] + C[b2+b3]`
   - Syllable 3: `C[b0+b2] + V[b1+b3] + C[b0+b1+b2+b3]`
4. **Capitalization**: First letter of each syllable is uppercased; the rest is lowercase.

Phoneme sets (18 consonants, 5 vowels):

- Consonants: `b c d f g h j k l m n p r s t v w z`
- Vowels: `a e i o u`

---

## Verified examples

Values computed by the server implementation and covered in unit tests:

| Coordinates `(x, y, z)` | Input string | CRC32 (decimal) | Name |
| ----------------------- | ------------ | --------------- | ---- |
| `(0, 0, 0)`             | `"0,0,0"`    | `3060064655`    | `Dam Zil Pod` |
| `(10, 10, 10)`          | `"10,10,10"` | `1240534424`    | `Ces Luf Top` |
| `(10, -10, 0)`          | `"10,-10,0"` | `3188532854`    | `Nod Nor Rez` |

---

## Implementation

### TypeScript (production)

```typescript
// src/shared/utils/cube-naming.ts
export const hashOriginToName = (originKey: string, salt = ''): string => {
  const hash = crc32(`${originKey}${salt}`);
  // ... map hash bytes to three CVC syllables
};
```

The origin key is built from the cube center: `` `${x},${y},${z}` ``.

### Collision handling

If a generated name already exists in MongoDB for a different origin (unlikely), the server appends a salt (`:1`, `:2`, …) to the input and rehashes — see `generateCubeNameWithCollisionHandling`.

---

## API notes

Cube names contain spaces. Clients must URL-encode them when calling `GET /infinity/cubes/by-name/:name` (e.g. `Ces%20Luf%20Top`).

Star names follow the existing pattern: `{Greek letter} {cube.name}` (e.g. `Alpha Ces Luf Top`).

---

## Related documents

- [cube-based-star-system.md](./cube-based-star-system.md) — how `name` fits in the cube model
- [cube-naming-v1.md](../cubes/cube-naming-v1.md) — superseded CRC32 + Base36 scheme
- [code-naming-v2.js](../cubes/code-naming-v2.js) — reference JavaScript snippet
