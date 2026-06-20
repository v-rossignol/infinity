import { GAME_CONSTANTS } from '../../constants/game.constants';
import { PlanetSurfaceGeneratorFactory } from './planet-surface-generator.factory';
import { RandomSurfaceGenerator } from './random-surface-generator';

describe('PlanetSurfaceGeneratorFactory', () => {
  it.each(GAME_CONSTANTS.PLANET_TYPES.filter((type) => type !== 'gas'))(
    'returns RandomSurfaceGenerator for landable type %s',
    (type) => {
      const generator = PlanetSurfaceGeneratorFactory.create(type, 7);
      expect(generator).toBeInstanceOf(RandomSurfaceGenerator);
    },
  );

  it('returns RandomSurfaceGenerator regardless of radius', () => {
    for (const radius of [5, 7, 15]) {
      const generator = PlanetSurfaceGeneratorFactory.create('rocky', radius);
      expect(generator).toBeInstanceOf(RandomSurfaceGenerator);
    }
  });
});
