import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { buildPlanetLocation } from '../../shared/utils/player-location';
import { PlayerSpawnService } from './player-spawn.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

describe('PlayersController', () => {
  let controller: PlayersController;

  const userId = 'user-uuid';
  const player = {
    id: 'player-uuid',
    userId,
    location: null,
  };

  const enterGameResult = {
    player: {
      ...player,
      location: buildPlanetLocation({
        cubeId: 'cube-1',
        starSystemId: 'star-1',
        planetId: 'star-1_planet_0',
        hex_coords: { q: 2, r: 4 },
      }),
    },
  };

  const mockPlayersService = {
    findByUserId: jest.fn(),
    createForUser: jest.fn(),
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
      mockPlayerSpawnService.bootstrapPlayer.mockResolvedValue(enterGameResult);

      const req = { user: { id: userId, username: 'pilot' } };

      await expect(controller.enterGame(req as never)).resolves.toEqual(enterGameResult);
      expect(mockPlayersService.createForUser).toHaveBeenCalledWith(userId);
      expect(mockPlayerSpawnService.bootstrapPlayer).toHaveBeenCalledWith(player);
    });

    it('reuses an existing player and bootstraps spawn', async () => {
      mockPlayersService.findByUserId.mockResolvedValue(player);
      mockPlayerSpawnService.bootstrapPlayer.mockResolvedValue(enterGameResult);

      const req = { user: { id: userId, username: 'pilot' } };

      await expect(controller.enterGame(req as never)).resolves.toEqual(enterGameResult);
      expect(mockPlayersService.createForUser).not.toHaveBeenCalled();
      expect(mockPlayerSpawnService.bootstrapPlayer).toHaveBeenCalledWith(player);
    });

    it('returns slim payload with planet-depth location only', async () => {
      mockPlayersService.findByUserId.mockResolvedValue(player);
      mockPlayerSpawnService.bootstrapPlayer.mockResolvedValue(enterGameResult);

      const result = await controller.enterGame({
        user: { id: userId, username: 'pilot' },
      } as never);

      expect(Object.keys(result)).toEqual(['player']);
      const location = result.player.location;
      expect(location && 'planet' in location && location.planet.id).toBe('star-1_planet_0');
      expect(location && 'cube' in location && 'position' in location.cube).toBe(false);
      expect(
        location && 'starSystem' in location && 'position' in location.starSystem,
      ).toBe(false);
    });

    it('returns the same location on repeat enter-game', async () => {
      mockPlayersService.findByUserId.mockResolvedValue(enterGameResult.player);
      mockPlayerSpawnService.bootstrapPlayer.mockResolvedValue(enterGameResult);

      const req = { user: { id: userId, username: 'pilot' } };
      const first = await controller.enterGame(req as never);
      const second = await controller.enterGame(req as never);

      expect(second).toEqual(first);
      expect(second.player.location).toEqual(first.player.location);
    });
  });

  it('getByUserId creates player when absent', async () => {
    mockPlayersService.findByUserId.mockResolvedValue(null);
    mockPlayersService.createForUser.mockResolvedValue(player);

    await expect(controller.getByUserId(userId)).resolves.toEqual(player);
  });
});
