import {
  filterAllowedHexes,
  isBiomeAllowedForUnit,
  NoAllowedHexError,
  pickRandomAllowedHex,
  rollRandomInHexPosition,
  UnitPlacementHex,
} from './unit-placement';

describe('unit-placement', () => {
  const hexagons: UnitPlacementHex[] = [
    { biome: 'ocean', coordinates: { q: 0, r: 0 } },
    { biome: 'forest', coordinates: { q: 1, r: 0 } },
    { biome: 'plain', coordinates: { q: 2, r: 0 } },
  ];

  const scoutEnvironments = ['desert', 'forest', 'mountain', 'ice', 'volcanic', 'plain'];

  describe('isBiomeAllowedForUnit', () => {
    it('returns true when biome is listed in environments', () => {
      expect(isBiomeAllowedForUnit('forest', scoutEnvironments)).toBe(true);
    });

    it('returns false when biome is not listed in environments', () => {
      expect(isBiomeAllowedForUnit('ocean', scoutEnvironments)).toBe(false);
    });
  });

  describe('filterAllowedHexes', () => {
    it('keeps only hexagons whose biome is allowed', () => {
      expect(filterAllowedHexes(hexagons, scoutEnvironments)).toEqual([
        hexagons[1],
        hexagons[2],
      ]);
    });
  });

  describe('pickRandomAllowedHex', () => {
    it('returns coordinates from an allowed hex', () => {
      expect(pickRandomAllowedHex(hexagons, scoutEnvironments, () => 0)).toEqual({ q: 1, r: 0 });
    });

    it('throws when no hex is allowed', () => {
      expect(() =>
        pickRandomAllowedHex(
          [{ ...hexagons[0] }],
          scoutEnvironments,
        ),
      ).toThrow(NoAllowedHexError);
    });
  });

  describe('rollRandomInHexPosition', () => {
    it('returns coordinates in the unit range [0, 1)', () => {
      expect(rollRandomInHexPosition(() => 0.42)).toEqual({ x: 0.42, y: 0.42 });
    });
  });
});
