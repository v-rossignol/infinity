export const GAME_CONSTANTS = {
  DEFAULT_PORT: 4000,
  PLANET_MAP_SIZE: 64,
  MAX_PLAYERS_PER_PLANET: 50,
  RESOURCE_TYPES: ['iron', 'gold', 'water', 'crystal'] as const,
  STAR_TYPES: ['yellow', 'red', 'blue', 'white'] as const,
  PLANET_TYPES: ['rocky', 'gas', 'ice', 'lava'] as const,
} as const;
