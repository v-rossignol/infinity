import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CubesController } from './cubes.controller';
import { CubeService } from './cube.service';

describe('CubesController', () => {
  let controller: CubesController;

  const payload = {
    cube: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'kikyhk',
      origin: { x: 10, y: 10, z: 10 },
      star_ids: ['661e8400-e29b-41d4-a716-446655440001'],
    },
    stars: [
      {
        id: '661e8400-e29b-41d4-a716-446655440001',
        name: 'Alpha kikyhk',
        local_coords: { x: 1.0, y: 2.0, z: 3.0 },
        cube_id: '550e8400-e29b-41d4-a716-446655440000',
        properties: { type: 'yellow' as const },
      },
    ],
  };

  const mockCubeService = {
    getOrCreateByOrigin: jest.fn(),
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CubesController],
      providers: [{ provide: CubeService, useValue: mockCubeService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CubesController);
  });

  it('returns cube and stars for grid-aligned coordinates', async () => {
    mockCubeService.getOrCreateByOrigin.mockResolvedValue(payload);

    await expect(controller.getCube('10', '10', '10')).resolves.toEqual(payload);
    expect(mockCubeService.getOrCreateByOrigin).toHaveBeenCalledWith({ x: 10, y: 10, z: 10 });
  });

  it('returns stars only for cube coordinate route', async () => {
    mockCubeService.getOrCreateByOrigin.mockResolvedValue(payload);

    await expect(controller.getStars('10', '10', '10')).resolves.toEqual({ stars: payload.stars });
  });

  it('rejects invalid coordinate params', async () => {
    await expect(controller.getCube('bad', '10', '10')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns cube by name when found', async () => {
    mockCubeService.findByName.mockResolvedValue(payload);

    await expect(controller.findByName('kikyhk')).resolves.toEqual(payload);
  });

  it('throws NotFoundException when cube name is missing', async () => {
    mockCubeService.findByName.mockResolvedValue(null);

    await expect(controller.findByName('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
