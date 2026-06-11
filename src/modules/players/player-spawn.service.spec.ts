import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SPAWN_CONSTANTS } from '../../shared/constants/spawn.constants';
import { NoEmptyCubeSlotError } from '../../shared/utils/spawn-cube-selection';
import { NoRockyPlanetError } from '../../shared/utils/spawn-selection';
import { CubeService } from '../galaxy/cube.service';
import { StarService } from '../galaxy/star.service';
import { StarSystemService } from '../galaxy/star-system.service';
import { PlanetsService } from '../planets/planets.service';
import { Player } from './entities/player.entity';
import { PlayerSpawnService } from './player-spawn.service';
import { PlayersService } from './players.service';

describe('PlayerSpawnService', () => {
  const playerId = 'player-uuid';
  const userId = 'user-uuid';
  const starId = 'star-uuid';
  const planetId = `${starId}_planet_0`;
  const cubeId = 'cube-uuid';

  const basePlayer: Player = {
    id: playerId,
    userId,
    galaxyX: 0,
    galaxyY: 0,
    galaxyZ: 0,
    currentPlanetId: null,
    planetX: 0,
    planetY: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Player;

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

  const mockPlayersService = {
    updatePosition: jest.fn(),
  };

  const mockCubeService = {
    pickSpawnCubeOrigin: jest.fn(),
    getOrCreateByOrigin: jest.fn(),
    findById: jest.fn(),
  };

  const mockStarSystemService = {
    getStarSystem: jest.fn(),
  };

  const mockStarService = {
    findById: jest.fn(),
  };

  const mockPlanetsService = {
    getPlanet: jest.fn(),
    joinPlanet: jest.fn(),
  };

  let service: PlayerSpawnService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerSpawnService,
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: CubeService, useValue: mockCubeService },
        { provide: StarSystemService, useValue: mockStarSystemService },
        { provide: StarService, useValue: mockStarService },
        { provide: PlanetsService, useValue: mockPlanetsService },
      ],
    }).compile();

    service = module.get(PlayerSpawnService);
  });

  it('returns existing spawn context when currentPlanetId is already set', async () => {
    const spawnedPlayer = {
      ...basePlayer,
      currentPlanetId: planetId,
      galaxyX: 9.2,
      planetX: 3,
      planetY: 7,
    };

    mockPlanetsService.getPlanet.mockResolvedValue(planet);
    mockStarService.findById.mockResolvedValue(star);
    mockCubeService.findById.mockResolvedValue(cube);

    const result = await service.bootstrapPlayer(spawnedPlayer);

    expect(result).toEqual({
      player: spawnedPlayer,
      cube,
      star,
      starSystemId: starId,
      planet,
      surfacePosition: { q: 3, r: 7 },
    });
    expect(mockCubeService.pickSpawnCubeOrigin).not.toHaveBeenCalled();
  });

  it('allocates a new spawn and persists player position last', async () => {
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
    mockPlanetsService.joinPlanet.mockResolvedValue({ planetId, q: 2, r: 5 });
    mockPlayersService.updatePosition.mockResolvedValue({
      ...basePlayer,
      currentPlanetId: planetId,
      galaxyX: 9.2,
      galaxyY: -3.5,
      galaxyZ: 3.0,
      planetX: 2,
      planetY: 5,
    });

    const result = await service.bootstrapPlayer(basePlayer);

    expect(mockPlanetsService.getPlanet).toHaveBeenCalledWith(planetId, starId);
    expect(mockPlanetsService.joinPlanet).toHaveBeenCalledWith(playerId, planetId);
    expect(mockPlayersService.updatePosition).toHaveBeenCalledWith(playerId, {
      galaxyX: 9.2,
      galaxyY: -3.5,
      galaxyZ: 3.0,
      currentPlanetId: planetId,
      planetX: 2,
      planetY: 5,
    });
    expect(result.starSystemId).toBe(starId);
    expect(result.surfacePosition).toEqual({ q: 2, r: 5 });
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
          planets: [{ id: planetId, type: 'gas', radius: 9, name: 'Gas', x: 0, y: 0, resources: {} }],
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
    mockPlanetsService.joinPlanet.mockResolvedValue({ planetId: planetBId, q: 1, r: 1 });
    mockPlayersService.updatePosition.mockResolvedValue({
      ...basePlayer,
      currentPlanetId: planetBId,
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

  it('throws NotFoundException when existing spawn star is missing', async () => {
    const spawnedPlayer = { ...basePlayer, currentPlanetId: planetId };

    mockPlanetsService.getPlanet.mockResolvedValue(planet);
    mockStarService.findById.mockResolvedValue(null);

    await expect(service.bootstrapPlayer(spawnedPlayer)).rejects.toBeInstanceOf(NotFoundException);
  });
});
