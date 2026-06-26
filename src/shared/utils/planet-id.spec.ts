import {
  buildPlanetId,
  parsePlanetIndexFromPlanetId,
  parseStarSystemIdFromPlanetId,
} from './planet-id';

describe('planet-id', () => {
  describe('buildPlanetId', () => {
    it('builds 1-based planet ids from a 0-based index', () => {
      const starId = '550e8400-e29b-41d4-a716-446655440000';
      expect(buildPlanetId(starId, 0)).toBe(`${starId}-p1`);
      expect(buildPlanetId(starId, 11)).toBe(`${starId}-p12`);
    });
  });

  describe('parseStarSystemIdFromPlanetId', () => {
    it('extracts star system id from a procedural planet id', () => {
      const starId = '550e8400-e29b-41d4-a716-446655440000';
      expect(parseStarSystemIdFromPlanetId(`${starId}-p1`)).toBe(starId);
      expect(parseStarSystemIdFromPlanetId(`${starId}-p12`)).toBe(starId);
    });

    it('returns null for invalid planet id formats', () => {
      expect(parseStarSystemIdFromPlanetId('not-a-planet')).toBeNull();
      expect(parseStarSystemIdFromPlanetId('star-p')).toBeNull();
      expect(parseStarSystemIdFromPlanetId('star-p0')).toBeNull();
      expect(parseStarSystemIdFromPlanetId('')).toBeNull();
    });
  });

  describe('parsePlanetIndexFromPlanetId', () => {
    it('returns the 0-based planet index', () => {
      const starId = '550e8400-e29b-41d4-a716-446655440000';
      expect(parsePlanetIndexFromPlanetId(`${starId}-p1`)).toBe(0);
      expect(parsePlanetIndexFromPlanetId(`${starId}-p12`)).toBe(11);
    });

    it('returns null for invalid planet id formats', () => {
      expect(parsePlanetIndexFromPlanetId('not-a-planet')).toBeNull();
    });
  });
});
