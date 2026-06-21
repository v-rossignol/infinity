import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UnitInstanceService } from '../units/unit-instance.service';
import { PlanetsController } from './planets.controller';
import { PlanetsService } from './planets.service';

describe('PlanetsController (integration)', () => {
  let app: INestApplication;

  const mockPlanetsService = {
    getPlanet: jest.fn(),
  };

  const mockUnitInstanceService = {
    listByPlanet: jest.fn(),
  };

  const landablePlanet = {
    _id: 'star-uuid_planet_0',
    name: 'Planet 1',
    starSystemId: 'star-uuid',
    type: 'rocky',
    radius: 5,
    resources: { iron: 100, gold: 50, water: 200 },
    surface: {
      hexagons: Array.from({ length: 30 }, (_, index) => ({
        biome: 'desert',
        resources: [],
        dangerLevel: 1,
        coordinates: { q: index % 5, r: Math.floor(index / 5) },
      })),
      generatedAt: new Date().toISOString(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanetsController],
      providers: [
        { provide: PlanetsService, useValue: mockPlanetsService },
        { provide: UnitInstanceService, useValue: mockUnitInstanceService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('infinity');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /infinity/planets/:planetId returns planet with surface', async () => {
    mockPlanetsService.getPlanet.mockResolvedValue(landablePlanet);

    const response = await request(app.getHttpServer())
      .get('/infinity/planets/star-uuid_planet_0')
      .query({ systemId: 'star-uuid' })
      .expect(200);

    expect(response.body).toEqual(landablePlanet);
    expect(mockPlanetsService.getPlanet).toHaveBeenCalledWith('star-uuid_planet_0', 'star-uuid');
  });

  it('GET rejects first entry without systemId with 400', async () => {
    mockPlanetsService.getPlanet.mockRejectedValue(
      new BadRequestException('systemId is required on first planet entry'),
    );

    await request(app.getHttpServer()).get('/infinity/planets/star-uuid_planet_0').expect(400);
  });

  it('GET returns 422 for gas planets', async () => {
    mockPlanetsService.getPlanet.mockRejectedValue(
      new UnprocessableEntityException('Gas planets have no enterable surface'),
    );

    await request(app.getHttpServer())
      .get('/infinity/planets/star-uuid_planet_1')
      .query({ systemId: 'star-uuid' })
      .expect(422);
  });

  it('GET returns 404 when summary id is missing', async () => {
    mockPlanetsService.getPlanet.mockRejectedValue(
      new NotFoundException('Planet "missing" not found in star system "star-uuid"'),
    );

    await request(app.getHttpServer())
      .get('/infinity/planets/missing')
      .query({ systemId: 'star-uuid' })
      .expect(404);
  });

  it('GET reload works without systemId when planet exists', async () => {
    mockPlanetsService.getPlanet.mockResolvedValue(landablePlanet);

    const response = await request(app.getHttpServer())
      .get('/infinity/planets/star-uuid_planet_0')
      .expect(200);

    expect(response.body._id).toBe('star-uuid_planet_0');
    expect(mockPlanetsService.getPlanet).toHaveBeenCalledWith('star-uuid_planet_0', undefined);
  });

  it('GET /infinity/planets/:planetId/units returns planet unit instances', async () => {
    const units = [{ id: '662e8400-e29b-41d4-a716-446655440002' }];
    mockUnitInstanceService.listByPlanet.mockResolvedValue(units);

    const response = await request(app.getHttpServer())
      .get('/infinity/planets/star-uuid_planet_0/units')
      .expect(200);

    expect(response.body).toEqual(units);
    expect(mockUnitInstanceService.listByPlanet).toHaveBeenCalledWith('star-uuid_planet_0');
  });
});
