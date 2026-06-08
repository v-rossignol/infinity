import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StarsController } from './stars.controller';
import { StarService } from './star.service';

describe('StarsController', () => {
  let controller: StarsController;

  const star = {
    id: 'Alpha kikyhk',
    local_coords: { x: 1.0, y: 2.0, z: 3.0 },
    cube_id: '550e8400-e29b-41d4-a716-446655440000',
    properties: { type: 'yellow' as const },
  };

  const mockStarService = {
    findById: jest.fn(),
    findByCubeId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StarsController],
      providers: [{ provide: StarService, useValue: mockStarService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(StarsController);
  });

  it('returns a star by id', async () => {
    mockStarService.findById.mockResolvedValue(star);

    await expect(controller.findById('Alpha%20kikyhk')).resolves.toEqual(star);
    expect(mockStarService.findById).toHaveBeenCalledWith('Alpha kikyhk');
  });

  it('throws NotFoundException when star is missing', async () => {
    mockStarService.findById.mockResolvedValue(null);

    await expect(controller.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns stars for a cube id query', async () => {
    mockStarService.findByCubeId.mockResolvedValue([star]);

    await expect(
      controller.findByCubeId({ cube_id: '550e8400-e29b-41d4-a716-446655440000' }),
    ).resolves.toEqual({ stars: [star] });
  });

  it('returns empty stars array when cube has no stars', async () => {
    mockStarService.findByCubeId.mockResolvedValue([]);

    await expect(
      controller.findByCubeId({ cube_id: '550e8400-e29b-41d4-a716-446655440000' }),
    ).resolves.toEqual({ stars: [] });
  });
});
