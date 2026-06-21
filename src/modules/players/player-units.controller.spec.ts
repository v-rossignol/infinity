import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnitInstanceService } from '../units/unit-instance.service';
import { PlayerUnitsController } from './player-units.controller';
import { PlayersService } from './players.service';

describe('PlayerUnitsController', () => {
  let controller: PlayerUnitsController;

  const mockPlayersService = {
    findByUserId: jest.fn(),
  };

  const mockUnitInstanceService = {
    listByOwner: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerUnitsController],
      providers: [
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: UnitInstanceService, useValue: mockUnitInstanceService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlayerUnitsController);
  });

  it('returns owned unit instances for the authenticated player', async () => {
    const player = { id: '773e8400-e29b-41d4-a716-446655440003', userId: 'user-1' };
    const units = [{ id: '662e8400-e29b-41d4-a716-446655440002' }];
    mockPlayersService.findByUserId.mockResolvedValue(player);
    mockUnitInstanceService.listByOwner.mockResolvedValue(units);

    await expect(
      controller.listMyUnits({ user: { id: 'user-1', username: 'player' } } as never),
    ).resolves.toEqual(units);
    expect(mockUnitInstanceService.listByOwner).toHaveBeenCalledWith(player.id);
  });

  it('throws when the player profile does not exist', async () => {
    mockPlayersService.findByUserId.mockResolvedValue(null);

    await expect(
      controller.listMyUnits({ user: { id: 'user-1', username: 'player' } } as never),
    ).rejects.toThrow(NotFoundException);
  });
});
