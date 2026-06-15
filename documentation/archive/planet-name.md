# Planet name generation

```yaml
date: 2026-06-15
author: Roro LeSage
sources:
  - src/shared/utils/planet-naming.ts
  - src/shared/utils/procedural-generation.ts
  - documentation/objects/star-system.md
```

## Overview

Planet display names are derived from the parent **star name** and the planet's **1-based generation index** in the star system. Existing star systems keep their stored names; only newly generated systems use this scheme.

## Format

`{Greek letter} {cubeNameNoSpaces} {Roman numeral}`

| Input | Output |
|-------|--------|
| Star `Alpha Tiv Gic Pem`, planet 1 | `Alpha TivGicPem I` |
| Star `Alpha Tiv Gic Pem`, planet 4 | `Alpha TivGicPem IV` |
| Star `Beta Ces Luf Top`, planet 3 | `Beta CesLufTop III` |

The Greek letter and spaced cube syllables come from the parent star (`{Greek} {syllable} {syllable} {syllable}`). Cube syllables are concatenated without spaces before the Roman numeral.

## Implementation

`getPlanetName(starName, planetNumber)` in `src/shared/utils/planet-naming.ts`.

Applied in `generateStarSystem()` when `StarSystemService` passes `star.name`. Gas and landable planets share the same naming rule.

## Reference

```ts
function getPlanetName(starName: string, planetNumber: number): string {
  const [greekLetter, ...cubeNameParts] = starName.split(' ');
  const cubeNameNoSpaces = cubeNameParts.join('');
  const romanNumeral = toRoman(planetNumber);
  return `${greekLetter} ${cubeNameNoSpaces} ${romanNumeral}`;
}
```
