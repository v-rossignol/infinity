import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayerCanEnterController } from './player-can-enter.controller';
import { PlayerLocationService } from './player-location.service';
import { PlayersService } from './players.service';

describe('PlayerCanEnterController', () => {
  const userId = 'user-uuid';
  const playerId = 'player-uuid';
  const cubeId = 'cube-uuid';
  const starSystemId = 'star-uuid';
  const planetId = `${starSystemId}_planet_0`;

  const player = { id: playerId, userId, location: null };

  const mockPlayersService = {
    findByUserId: jest.fn(),
  };

  const mockPlayerLocationService = {
    canEnterCube: jest.fn(),
    canEnterStarSystem: jest.fn(),
    canEnterPlanet: jest.fn(),
  };

  let controller: PlayerCanEnterController;

  const authReq = { user: { id: userId, username: 'pilot' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPlayersService.findByUserId.mockResolvedValue(player);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerCanEnterController],
      providers: [
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: PlayerLocationService, useValue: mockPlayerLocationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlayerCanEnterController);
  });

  it('canEnterCube returns service result for regular users', async () => {
    mockPlayerLocationService.canEnterCube.mockResolvedValue(true);

    const result = await controller.canEnterCube(authReq as never, cubeId);

    expect(mockPlayerLocationService.canEnterCube).toHaveBeenCalledWith(playerId, cubeId, {
      isAdmin: false,
    });
    expect(result).toEqual({ canEnter: true });
  });

  it('canEnterCube passes admin flag for admin users', async () => {
    mockPlayerLocationService.canEnterCube.mockResolvedValue(true);

    await controller.canEnterCube(
      { user: { id: userId, username: 'admin', role: 'admin' } } as never,
      cubeId,
    );

    expect(mockPlayerLocationService.canEnterCube).toHaveBeenCalledWith(playerId, cubeId, {
      isAdmin: true,
    });
  });

  it('canEnterStarSystem returns service result', async () => {
    mockPlayerLocationService.canEnterStarSystem.mockResolvedValue(false);

    const result = await controller.canEnterStarSystem(authReq as never, starSystemId);

    expect(mockPlayerLocationService.canEnterStarSystem).toHaveBeenCalledWith(
      playerId,
      starSystemId,
      { isAdmin: false },
    );
    expect(result).toEqual({ canEnter: false });
  });

  it('canEnterPlanet returns service result', async () => {
    mockPlayerLocationService.canEnterPlanet.mockResolvedValue(true);

    const result = await controller.canEnterPlanet(authReq as never, planetId);

    expect(mockPlayerLocationService.canEnterPlanet).toHaveBeenCalledWith(playerId, planetId, {
      isAdmin: false,
    });
    expect(result).toEqual({ canEnter: true });
  });

  it('throws NotFoundException when player is missing', async () => {
    mockPlayersService.findByUserId.mockResolvedValue(null);

    await expect(controller.canEnterCube(authReq as never, cubeId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
