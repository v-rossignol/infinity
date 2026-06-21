import { Test, TestingModule } from '@nestjs/testing';
import { ADMIN_CONSTANTS } from '../../shared/constants/admin.constants';
import { PlanetPreview } from '../../shared/interfaces/planet-preview.interface';
import { RedisService } from '../redis/redis.service';
import { PlanetPreviewCacheService } from './planet-preview-cache.service';

describe('PlanetPreviewCacheService', () => {
  let service: PlanetPreviewCacheService;

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const preview: PlanetPreview = {
    _id: '1',
    name: 'Preview Planet',
    type: 'rocky',
    radius: 10,
    surface: {
      hexagons: [
        {
          biome: 'forest',
          resources: [],
          dangerLevel: 1,
          coordinates: { q: 0, r: 0 },
        },
      ],
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanetPreviewCacheService, { provide: RedisService, useValue: redisService }],
    }).compile();

    service = module.get(PlanetPreviewCacheService);
  });

  it('stores preview under params and id keys', async () => {
    await service.save(preview);

    expect(redisService.set).toHaveBeenCalledTimes(2);
    expect(redisService.set).toHaveBeenCalledWith(
      'planet:preview:1:10:rocky',
      JSON.stringify(preview),
      ADMIN_CONSTANTS.PLANET_PREVIEW_CACHE_TTL_SECONDS,
    );
    expect(redisService.set).toHaveBeenCalledWith(
      'planet:preview:id:1',
      JSON.stringify(preview),
      ADMIN_CONSTANTS.PLANET_PREVIEW_CACHE_TTL_SECONDS,
    );
  });

  it('loads preview by id and restores generatedAt', async () => {
    redisService.get.mockResolvedValue(
      JSON.stringify({
        ...preview,
        surface: {
          ...preview.surface,
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    );

    await expect(service.getById('1')).resolves.toEqual(preview);
    expect(redisService.get).toHaveBeenCalledWith('planet:preview:id:1');
  });

  it('loads preview by generation params', async () => {
    redisService.get.mockResolvedValue(JSON.stringify(preview));

    await expect(service.getByParams('1', 10, 'rocky')).resolves.toEqual(preview);
    expect(redisService.get).toHaveBeenCalledWith('planet:preview:1:10:rocky');
  });
});
