import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayerSpawnService } from './player-spawn.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

describe('PlayersController', () => {
  let controller: PlayersController;

  const userId = 'user-uuid';
  const player = {
    id: 'player-uuid',
    userId,
    galaxyX: 0,
    galaxyY: 0,
    galaxyZ: 0,
    currentPlanetId: null,
    planetX: 0,
    planetY: 0,
  };

  const spawnResult = {
    player: { ...player, currentPlanetId: 'planet-1' },
    cube: { id: 'cube-1', name: 'cube', origin: { x: 10, y: 0, z: 0 }, star_ids: [] },
    star: {
      id: 'star-1',
      name: 'Alpha cube',
      local_coords: { x: 1, y: 2, z: 3 },
      cube_id: 'cube-1',
      properties: { type: 'yellow' as const },
    },
    starSystemId: 'star-1',
    planet: { _id: 'planet-1', name: 'Planet 1' },
    surfacePosition: { q: 2, r: 4 },
  };

  const mockPlayersService = {
    findByUserId: jest.fn(),
    createForUser: jest.fn(),
    updatePosition: jest.fn(),
  };

  const mockPlayerSpawnService = {
    bootstrapPlayer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: PlayerSpawnService, useValue: mockPlayerSpawnService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlayersController);
  });

  describe('enterGame', () => {
    it('creates a player when missing and bootstraps spawn', async () => {
      mockPlayersService.findByUserId.mockResolvedValue(null);
      mockPlayersService.createForUser.mockResolvedValue(player);
      mockPlayerSpawnService.bootstrapPlayer.mockResolvedValue(spawnResult);

      const req = { user: { id: userId, username: 'pilot' } };

      await expect(controller.enterGame(req as never)).resolves.toEqual(spawnResult);
      expect(mockPlayersService.createForUser).toHaveBeenCalledWith(userId);
      expect(mockPlayerSpawnService.bootstrapPlayer).toHaveBeenCalledWith(player);
    });

    it('reuses an existing player and bootstraps spawn', async () => {
      mockPlayersService.findByUserId.mockResolvedValue(player);
      mockPlayerSpawnService.bootstrapPlayer.mockResolvedValue(spawnResult);

      const req = { user: { id: userId, username: 'pilot' } };

      await expect(controller.enterGame(req as never)).resolves.toEqual(spawnResult);
      expect(mockPlayersService.createForUser).not.toHaveBeenCalled();
      expect(mockPlayerSpawnService.bootstrapPlayer).toHaveBeenCalledWith(player);
    });
  });

  it('getByUserId creates player when absent', async () => {
    mockPlayersService.findByUserId.mockResolvedValue(null);
    mockPlayersService.createForUser.mockResolvedValue(player);

    await expect(controller.getByUserId(userId)).resolves.toEqual(player);
  });
});
