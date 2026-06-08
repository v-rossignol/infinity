import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StarService } from './star.service';
import { Star } from './entities/star.schema';

describe('StarService', () => {
  let service: StarService;

  const mockStarModel = {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarService,
        {
          provide: getModelToken(Star.name),
          useValue: mockStarModel,
        },
      ],
    }).compile();

    service = module.get(StarService);
  });

  it('findByCubeId maps mongoose documents to StarData', async () => {
    mockStarModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'Alpha kikyhk',
          local_coords: { x: 1, y: 2, z: 3 },
          cube_id: 'cube-uuid',
          properties: { type: 'yellow' },
        },
      ]),
    });

    const stars = await service.findByCubeId('cube-uuid');
    expect(stars).toEqual([
      {
        id: 'Alpha kikyhk',
        local_coords: { x: 1, y: 2, z: 3 },
        cube_id: 'cube-uuid',
        properties: { type: 'yellow' },
      },
    ]);
  });

  it('findById returns null when star is missing', async () => {
    mockStarModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findById('missing')).resolves.toBeNull();
  });

  it('saveManyBestEffort continues when a star insert fails', async () => {
    mockStarModel.create
      .mockRejectedValueOnce(new Error('duplicate'))
      .mockResolvedValueOnce(undefined);

    await expect(
      service.saveManyBestEffort([
        {
          id: 'Alpha kikyhk',
          local_coords: { x: 1, y: 2, z: 3 },
          cube_id: 'cube-uuid',
          properties: { type: 'yellow' },
        },
        {
          id: 'Beta kikyhk',
          local_coords: { x: 4, y: 5, z: 6 },
          cube_id: 'cube-uuid',
          properties: { type: 'red' },
        },
      ]),
    ).resolves.toBeUndefined();

    expect(mockStarModel.create).toHaveBeenCalledTimes(2);
  });
});
