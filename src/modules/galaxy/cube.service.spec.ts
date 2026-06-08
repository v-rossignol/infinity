import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GALAXY_CONSTANTS } from '../../shared/constants/galaxy.constants';
import { CubeService } from './cube.service';
import { StarService } from './star.service';
import { RedisService } from '../redis/redis.service';
import { Cube } from './entities/cube.schema';

jest.mock('../../shared/utils/galaxy', () => ({
  generateCube: jest.fn(),
}));

import { generateCube } from '../../shared/utils/galaxy';

const mockedGenerateCube = generateCube as jest.MockedFunction<typeof generateCube>;

describe('CubeService', () => {
  let service: CubeService;

  const origin = { x: 10, y: 10, z: 10 };
  const payload = {
    cube: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'kikyhk',
      origin,
      star_ids: ['Alpha kikyhk'],
    },
    stars: [
      {
        id: 'Alpha kikyhk',
        local_coords: { x: 1.0, y: 2.0, z: 3.0 },
        cube_id: '550e8400-e29b-41d4-a716-446655440000',
        properties: { type: 'yellow' as const },
      },
    ],
  };

  const mockCubeModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockStarService = {
    findByCubeId: jest.fn(),
    saveManyBestEffort: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CubeService,
        {
          provide: getModelToken(Cube.name),
          useValue: mockCubeModel,
        },
        {
          provide: StarService,
          useValue: mockStarService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get(CubeService);
  });

  it('rejects non-grid-aligned origins', async () => {
    await expect(service.getOrCreateByOrigin({ x: 5, y: 10, z: 10 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns cube from MongoDB when it already exists', async () => {
    mockCubeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: payload.cube.id,
        name: payload.cube.name,
        origin: payload.cube.origin,
        star_ids: payload.cube.star_ids,
      }),
    });
    mockStarService.findByCubeId.mockResolvedValue(payload.stars);

    const result = await service.getOrCreateByOrigin(origin);

    expect(result).toEqual(payload);
    expect(mockedGenerateCube).not.toHaveBeenCalled();
    expect(mockRedisService.set).toHaveBeenCalledTimes(3);
  });

  it('returns cached payload and attempts persistence when MongoDB miss', async () => {
    mockCubeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockRedisService.get.mockResolvedValue(JSON.stringify(payload));
    mockCubeModel.create.mockResolvedValue(undefined);
    mockStarService.saveManyBestEffort.mockResolvedValue(undefined);

    const result = await service.getOrCreateByOrigin(origin);

    expect(result).toEqual(payload);
    expect(mockedGenerateCube).not.toHaveBeenCalled();
    expect(mockCubeModel.create).toHaveBeenCalled();
    expect(mockStarService.saveManyBestEffort).toHaveBeenCalledWith(payload.stars);
  });

  it('generates, caches, and persists when cube is missing everywhere', async () => {
    mockCubeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockRedisService.get.mockResolvedValue(null);
    mockedGenerateCube.mockReturnValue(payload);
    mockCubeModel.create.mockResolvedValue(undefined);
    mockStarService.saveManyBestEffort.mockResolvedValue(undefined);

    const result = await service.getOrCreateByOrigin(origin);

    expect(result).toEqual(payload);
    expect(mockedGenerateCube).toHaveBeenCalledWith({ origin });
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'galaxy:cube:origin:10,10,10',
      JSON.stringify(payload),
      GALAXY_CONSTANTS.CUBE_CACHE_TTL_SECONDS,
    );
  });

  it('findByName returns payload from MongoDB', async () => {
    mockCubeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: payload.cube.id,
        name: payload.cube.name,
        origin: payload.cube.origin,
        star_ids: payload.cube.star_ids,
      }),
    });
    mockStarService.findByCubeId.mockResolvedValue(payload.stars);

    await expect(service.findByName('kikyhk')).resolves.toEqual(payload);
  });

  it('findByName returns payload from Redis when MongoDB miss', async () => {
    mockCubeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockRedisService.get.mockResolvedValue(JSON.stringify(payload));

    await expect(service.findByName('kikyhk')).resolves.toEqual(payload);
  });

  it('findByName returns null when cube is not found', async () => {
    mockCubeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockRedisService.get.mockResolvedValue(null);

    await expect(service.findByName('missing')).resolves.toBeNull();
  });

  it('invalidateCache deletes all cube cache keys', async () => {
    await service.invalidateCache(payload.cube);

    expect(mockRedisService.del).toHaveBeenCalledWith(
      'galaxy:cube:origin:10,10,10',
      'galaxy:cube:id:550e8400-e29b-41d4-a716-446655440000',
      'galaxy:cube:name:kikyhk',
    );
  });
});
