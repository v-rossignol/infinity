import { parseStarSystemIdFromPlanetId } from './planet-id';

describe('parseStarSystemIdFromPlanetId', () => {
  it('extracts star system id from a procedural planet id', () => {
    const starId = '550e8400-e29b-41d4-a716-446655440000';
    expect(parseStarSystemIdFromPlanetId(`${starId}_planet_0`)).toBe(starId);
    expect(parseStarSystemIdFromPlanetId(`${starId}_planet_12`)).toBe(starId);
  });

  it('returns null for invalid planet id formats', () => {
    expect(parseStarSystemIdFromPlanetId('not-a-planet')).toBeNull();
    expect(parseStarSystemIdFromPlanetId('star_planet')).toBeNull();
    expect(parseStarSystemIdFromPlanetId('')).toBeNull();
  });
});
