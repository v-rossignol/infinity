import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

describe('ResourcesController (integration)', () => {
  let app: INestApplication;

  const mockResourcesService = {
    findByPlanetId: jest.fn(),
    findByPlanetHex: jest.fn(),
    parseHexCoordinate: jest.fn((value: string, field: string) => {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`${field} must be a non-negative integer`);
      }
      return parsed;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesController],
      providers: [{ provide: ResourcesService, useValue: mockResourcesService }],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('infinity');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /infinity/resources/planet/:planetId/hex/:q/:r returns hex resources', async () => {
    const payload = {
      planetId: 'star-uuid-p1',
      coordinates: { q: 2, r: 1 },
      biome: 'forest',
      resources: [{ type: 'wood', abundance: 50, rarity: 'common' }],
    };
    mockResourcesService.findByPlanetHex.mockResolvedValue(payload);

    const response = await request(app.getHttpServer())
      .get('/infinity/resources/planet/star-uuid-p1/hex/2/1')
      .expect(200);

    expect(response.body).toEqual(payload);
    expect(mockResourcesService.findByPlanetHex).toHaveBeenCalledWith('star-uuid-p1', 2, 1);
  });

  it('GET /infinity/resources/planet/:planetId returns planet resource nodes', async () => {
    mockResourcesService.findByPlanetId.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/infinity/resources/planet/star-uuid-p1').expect(200);

    expect(mockResourcesService.findByPlanetId).toHaveBeenCalledWith('star-uuid-p1');
  });

  it('GET hex route propagates not found errors', async () => {
    mockResourcesService.findByPlanetHex.mockRejectedValue(
      new NotFoundException('Planet "missing" not found'),
    );

    await request(app.getHttpServer())
      .get('/infinity/resources/planet/missing/hex/0/0')
      .expect(404);
  });
});
