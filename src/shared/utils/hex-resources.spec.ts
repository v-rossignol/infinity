import { resolveHexResources } from './hex-resources';

describe('resolveHexResources', () => {
  it('returns permanent resources for the hex biome', () => {
    const resources = resolveHexResources('mountain');

    expect(resources).toEqual([
      { type: 'stone', abundance: 75, rarity: 'common' },
      { type: 'iron-ore', abundance: 10, rarity: 'common' },
      { type: 'copper-ore', abundance: 10, rarity: 'common' },
      { type: 'coal', abundance: 5, rarity: 'common' },
    ]);
  });

  it('returns different permanent resources per biome', () => {
    const plainResources = resolveHexResources('plain');
    const mountainResources = resolveHexResources('mountain');

    expect(plainResources).toEqual(
      expect.arrayContaining([{ type: 'fresh-water', abundance: 10, rarity: 'common' }]),
    );
    expect(mountainResources).toEqual(
      expect.arrayContaining([{ type: 'stone', abundance: 75, rarity: 'common' }]),
    );
  });
});
