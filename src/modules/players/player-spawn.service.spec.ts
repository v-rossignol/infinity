import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SPAWN_CONSTANTS } from '../../shared/constants/spawn.constants';
import { buildPlanetLocation, getLocationDepth } from '../../shared/utils/player-location';
import { NoEmptyCubeSlotError } from '../../shared/utils/spawn-cube-selection';
import { NoRockyPlanetError } from '../../shared/utils/spawn-selection';
import { CubeService } from '../galaxy/cube.service';
import { StarSystemService } from '../galaxy/star-system.service';
import { PlanetsService } from '../planets/planets.service';
import { Player } from './entities/player.entity';
import { PlayerLocationService } from './player-location.service';
import { PlayerSpawnService } from './player-spawn.service';

describe('PlayerSpawnService', () => {
  const playerId = 'player-uuid';
  const userId = 'user-uuid';
  const starId = 'star-uuid';
  const planetId = `${starId}_planet_0`;
  const cubeId = 'cube-uuid';

  const basePlayer: Player = {
    id: playerId,
    userId,
    location: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Player;

  const planetLocation = buildPlanetLocation({
    cubeId,
    starSystemId: starId,
    planetId,
    hex_coords: { q: 3, r: 7 },
  });

  const cube = {
    id: cubeId,
    name: 'spawn-cube',
    origin: { x: 10, y: 0, z: 0 },
    star_ids: [starId],
  };

  const star = {
    id: starId,
    name: 'Alpha spawn-cube',
    local_coords: { x: 4.2, y: 1.5, z: 8.0 },
    cube_id: cubeId,
    properties: { type: 'yellow' as const },
  };

  const planet = {
    _id: planetId,
    name: 'Planet 1',
    starSystemId: starId,
    type: 'rocky',
    radius: 9,
    resources: { iron: 100 },
    surface: { hexagons: [], generatedAt: new Date() },
  };

  const mockPlayerLocationService = {
    setLocation: jest.fn(),
  };

  const mockCubeService = {
    pickSpawnCubeOrigin: jest.fn(),
    getOrCreateByOrigin: jest.fn(),
  };

  const mockStarSystemService = {
    getStarSystem: jest.fn(),
  };

  const mockPlanetsService = {
    getPlanet: jest.fn(),
    rollRandomPosition: jest.fn(),
  };

  let service: PlayerSpawnService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerSpawnService,
        { provide: PlayerLocationService, useValue: mockPlayerLocationService },
        { provide: CubeService, useValue: mockCubeService },
        { provide: StarSystemService, useValue: mockStarSystemService },
        { provide: PlanetsService, useValue: mockPlanetsService },
      ],
    }).compile();

    service = module.get(PlayerSpawnService);
  });

  it('returns the player when location is already set without re-fetching world data', async () => {
    const spawnedPlayer = {
      ...basePlayer,
      location: planetLocation,
    };

    const result = await service.bootstrapPlayer(spawnedPlayer);

    expect(result).toEqual({ player: spawnedPlayer });
    expect(mockCubeService.pickSpawnCubeOrigin).not.toHaveBeenCalled();
    expect(mockPlanetsService.getPlanet).not.toHaveBeenCalled();
    expect(mockPlayerLocationService.setLocation).not.toHaveBeenCalled();
  });

  it('allocates a new spawn and persists player location last', async () => {
    const newLocation = buildPlanetLocation({
      cubeId,
      starSystemId: starId,
      planetId,
      hex_coords: { q: 2, r: 5 },
    });

    mockCubeService.pickSpawnCubeOrigin.mockResolvedValue(cube.origin);
    mockCubeService.getOrCreateByOrigin.mockResolvedValue({ cube, stars: [star] });
    mockStarSystemService.getStarSystem.mockResolvedValue({
      _id: starId,
      name: star.name,
      planets: [
        { id: planetId, name: 'Planet 1', x: 0, y: 0, radius: 9, type: 'rocky', resources: {} },
      ],
    });
    mockPlanetsService.getPlanet.mockResolvedValue(planet);
    mockPlanetsService.rollRandomPosition.mockReturnValue({ q: 2, r: 5 });
    mockPlayerLocationService.setLocation.mockResolvedValue({
      ...basePlayer,
      location: newLocation,
    });

    const result = await service.bootstrapPlayer(basePlayer);

    expect(mockPlanetsService.getPlanet).toHaveBeenCalledWith(planetId, starId);
    expect(mockPlanetsService.rollRandomPosition).toHaveBeenCalledWith(planet.radius);
    expect(mockPlayerLocationService.setLocation).toHaveBeenCalledWith(playerId, newLocation);
    expect(result).toEqual({
      player: {
        ...basePlayer,
        location: newLocation,
      },
    });
    expect(getLocationDepth(newLocation)).toBe('planet');
    expect(newLocation.planet.id).toBe(planetId);
  });

  it('retries another star when the first system has no rocky planet', async () => {
    const starB = { ...star, id: 'star-b', name: 'Beta spawn-cube' };
    const planetBId = 'star-b_planet_0';

    mockCubeService.pickSpawnCubeOrigin.mockResolvedValue(cube.origin);
    mockCubeService.getOrCreateByOrigin.mockResolvedValue({ cube, stars: [star, starB] });
    mockStarSystemService.getStarSystem.mockImplementation(async (id: string) => {
      if (id === starId) {
        return {
          _id: starId,
          planets: [
            { id: planetId, type: 'gas', radius: 9, name: 'Gas', x: 0, y: 0, resources: {} },
          ],
        };
      }
      return {
        _id: starB.id,
        planets: [
          { id: planetBId, type: 'rocky', radius: 7, name: 'Rocky', x: 0, y: 0, resources: {} },
        ],
      };
    });

    let pickCount = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      pickCount++;
      return pickCount === 1 ? 0 : 0.99;
    });

    mockPlanetsService.getPlanet.mockResolvedValue({ ...planet, _id: planetBId });
    mockPlanetsService.rollRandomPosition.mockReturnValue({ q: 1, r: 1 });
    mockPlayerLocationService.setLocation.mockResolvedValue({
      ...basePlayer,
      location: buildPlanetLocation({
        cubeId,
        starSystemId: starB.id,
        planetId: planetBId,
        hex_coords: { q: 1, r: 1 },
      }),
    });

    await service.bootstrapPlayer(basePlayer);

    expect(mockStarSystemService.getStarSystem).toHaveBeenCalledTimes(2);
    (Math.random as jest.Mock).mockRestore();
  });

  it('throws ServiceUnavailableException after full spawn attempts are exhausted', async () => {
    mockCubeService.pickSpawnCubeOrigin.mockRejectedValue(new NoEmptyCubeSlotError());

    await expect(service.bootstrapPlayer(basePlayer)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mockCubeService.pickSpawnCubeOrigin).toHaveBeenCalledTimes(
      SPAWN_CONSTANTS.SPAWN_FULL_ATTEMPTS,
    );
  });
});
