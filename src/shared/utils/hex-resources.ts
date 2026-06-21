import { PERMANENT_TERRAIN_RESOURCES } from '../constants/terrain-resources.constants';
import { HexagonResource, HexBiome } from '../interfaces/planet.interface';

export function resolveHexResources(biome: HexBiome): HexagonResource[] {
  return PERMANENT_TERRAIN_RESOURCES[biome].map((entry) => ({
    type: entry.id,
    abundance: entry.quantity,
    rarity: 'common' as const,
  }));
}
