export const GAME_CONSTANTS = {
  DEFAULT_PORT: 4000,
  PLANET_MAP_SIZE: 64,
  PLANET_RADIUS_MIN: 5,
  PLANET_RADIUS_MAX: 15,
  PLANET_ORBIT_DISTANCE_MIN: 100,
  PLANET_ORBIT_DISTANCE_MAX: 150,
  PLANET_COUNT_MIN: 3,
  PLANET_COUNT_MAX: 7,
  MAX_PLAYERS_PER_PLANET: 50,
  RESOURCE_TYPES: ['iron', 'gold', 'water', 'crystal'] as const,
  STAR_TYPES: ['yellow', 'red', 'blue', 'white'] as const,
  PLANET_TYPES: ['rocky', 'gas', 'ice', 'lava'] as const,
  HEX_BIOMES: ['desert', 'forest', 'ocean', 'mountain', 'ice', 'volcanic', 'plain'] as const,
  RESOURCE_RARITIES: ['common', 'rare', 'epic', 'legendary'] as const,
  // Pointy-top odd-r layout (matches terra-view hexLayout DEFAULT_HEX_LAYOUT).
  PLANET_HEX_LAYOUT_WIDTH: 80,
  PLANET_HEX_LAYOUT_HEIGHT: 92,
  // Speed multiplier base for planet-surface vehicles.
  // speed=1 means 1 hex per 2 minutes (calibrated as the time to cross the largest
  // distance within a single hex at standard speed).
  PLANET_BASE_MOVEMENT_MS_PER_HEX: 120_000,
} as const;
