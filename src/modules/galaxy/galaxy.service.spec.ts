import { Test, TestingModule } from '@nestjs/testing';
import { buildCubeLocation } from '../../shared/utils/player-location';
import { PlayerLocationService } from '../players/player-location.service';
import { GalaxyService } from './galaxy.service';

describe('GalaxyService', () => {
  const playerId = 'player-uuid';
  const cubeId = 'cube-uuid';

  const mockPlayerLocationService = {
    updateCubePosition: jest.fn(),
    updateStarSystemPosition: jest.fn(),
  };

  let service: GalaxyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalaxyService,
        { provide: PlayerLocationService, useValue: mockPlayerLocationService },
      ],
    }).compile();

    service = module.get(GalaxyService);
  });

  it('handlePlayerMove delegates to updateCubePosition', async () => {
    const position = { x: 1.5, y: 2.5, z: 3.5 };
    const player = {
      id: playerId,
      location: buildCubeLocation({ cubeId, position }),
    };
    mockPlayerLocationService.updateCubePosition.mockResolvedValue(player);

    const result = await service.handlePlayerMove(playerId, position);

    expect(mockPlayerLocationService.updateCubePosition).toHaveBeenCalledWith(playerId, position);
    expect(result).toBe(player);
  });

  it('handleSystemMove delegates to updateStarSystemPosition', async () => {
    const position = { x: 10, y: 20 };
    const player = { id: playerId, location: null };
    mockPlayerLocationService.updateStarSystemPosition.mockResolvedValue(player);

    const result = await service.handleSystemMove(playerId, position);

    expect(mockPlayerLocationService.updateStarSystemPosition).toHaveBeenCalledWith(
      playerId,
      position,
    );
    expect(result).toBe(player);
  });
});
