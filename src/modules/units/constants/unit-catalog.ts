import { GAME_CONSTANTS } from '../../../shared/constants/game.constants';
import { UnitTypeDefinition } from '../../../shared/interfaces/unit-type.interface';

const SCOUT_X1_ENVIRONMENTS = GAME_CONSTANTS.HEX_BIOMES.filter((biome) => biome !== 'ocean');

export const SCOUT_X1: UnitTypeDefinition = {
  id: 'scout-x1',
  name: 'Scout-X1',
  type: 'vehicule',
  size: 'small',
  mobility: true,
  environments: [...SCOUT_X1_ENVIRONMENTS],
  rules: [{ range: 'hexagon', value: 1 }],
  capabilities: {
    extraction: { speed: 5, types: ['*'] },
    cargo: { size: 1000 },
  },
  description: 'Can explore, extract, and build small structures.',
  speed: 1,
  metadata: {},
};

export const UNIT_CATALOG: UnitTypeDefinition[] = [SCOUT_X1];
