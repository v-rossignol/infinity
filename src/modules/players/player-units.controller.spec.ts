import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnitInstanceService } from '../units/unit-instance.service';
import { UnitMovementService } from '../units/unit-movement.service';
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

  const mockUnitMovementService = {
    orderMove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerUnitsController],
      providers: [
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: UnitInstanceService, useValue: mockUnitInstanceService },
        { provide: UnitMovementService, useValue: mockUnitMovementService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlayerUnitsController);
  });

  describe('listMyUnits', () => {
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

  describe('moveUnit', () => {
    const player = { id: 'player-uuid', userId: 'user-1' };
    const unitId = 'unit-uuid';
    const dto = { planetId: 'planet-1', targetHex: { q: 1, r: 0 } };

    it('returns the move order result', async () => {
      const result = {
        unitId,
        status: 'moving' as const,
        startAt: '2026-06-26T19:58:00.000Z',
        arrivalAt: '2026-06-26T20:00:00.000Z',
        origin: { hex: { q: 0, r: 0 }, position: { x: 0.5, y: 0.5 } },
        destination: { hex: { q: 1, r: 0 }, position: { x: 0.5, y: 0.5 } },
        distance: 0.867,
      };
      mockPlayersService.findByUserId.mockResolvedValue(player);
      mockUnitMovementService.orderMove.mockResolvedValue(result);

      await expect(
        controller.moveUnit({ user: { id: 'user-1', username: 'player' } } as never, unitId, dto as never),
      ).resolves.toEqual(result);
      expect(mockUnitMovementService.orderMove).toHaveBeenCalledWith(player.id, unitId, dto);
    });

    it('throws NotFoundException when player profile does not exist', async () => {
      mockPlayersService.findByUserId.mockResolvedValue(null);

      await expect(
        controller.moveUnit({ user: { id: 'user-1', username: 'player' } } as never, unitId, dto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates service exceptions', async () => {
      mockPlayersService.findByUserId.mockResolvedValue(player);
      mockUnitMovementService.orderMove.mockRejectedValue(new ConflictException('Unit is already moving'));

      await expect(
        controller.moveUnit({ user: { id: 'user-1', username: 'player' } } as never, unitId, dto as never),
      ).rejects.toThrow(ConflictException);
    });
  });
});
