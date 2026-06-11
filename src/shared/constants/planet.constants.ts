export const PLANET_CONSTANTS = {
  POSITION_REDIS_PREFIX: 'planet:position',
  POSITION_TTL_SECONDS: 60 * 60 * 24 * 7,
} as const;

export const getPlanetPositionRedisKey = (planetId: string, playerId: string): string =>
  `${PLANET_CONSTANTS.POSITION_REDIS_PREFIX}:${planetId}:${playerId}`;
