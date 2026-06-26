import { Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SCOUT_X1 } from './constants/unit-catalog';
import { UnitInstance } from './entities/unit-instance.entity';
import { UnitType } from './entities/unit-type.entity';
import { UnitCatalogService } from './unit-catalog.service';
import { UnitInstanceService } from './unit-instance.service';
import { PlayersService } from '../players/players.service';
import { buildUnitPlanetLocation } from '../../shared/utils/player-location';

describe('UnitInstanceService', () => {
  let service: UnitInstanceService;

  const unitInstanceRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const unitCatalogService = {
    getUnitTypeById: jest.fn(),
  };

  const playersService = {
    findById: jest.fn(),
  };

  const ownerId = '773e8400-e29b-41d4-a716-446655440003';
  const planetId = '661e8400-e29b-41d4-a716-446655440001-p1';
  const starSystemId = '661e8400-e29b-41d4-a716-446655440001';
  const cubeId = '550e8400-e29b-41d4-a716-446655440000';

  const location = buildUnitPlanetLocation({
    cubeId,
    starSystemId,
    planetId,
    hex_coords: { q: 12, r: 7 },
    position: { x: 0.35, y: 0.72 },
  });

  const createdAt = new Date('2026-06-21T10:00:00.000Z');
  const updatedAt = new Date('2026-06-21T10:00:00.000Z');

  const instance: UnitInstance = {
    id: '662e8400-e29b-41d4-a716-446655440002',
    typeId: SCOUT_X1.id,
    unitType: {} as UnitType,
    ownerId,
    owner: {} as never,
    location,
    placeLevel: 'planet',
    cubeId,
    starSystemId: null,
    planetId,
    status: 'inactive',
    metadata: {},
    createdAt,
    updatedAt,
  };

  const unitType: UnitType = {
    id: SCOUT_X1.id,
    name: SCOUT_X1.name,
    type: SCOUT_X1.type,
    size: SCOUT_X1.size,
    mobility: SCOUT_X1.mobility,
    speed: SCOUT_X1.speed,
    environments: SCOUT_X1.environments,
    rules: SCOUT_X1.rules,
    capabilities: SCOUT_X1.capabilities,
    description: SCOUT_X1.description,
    metadata: SCOUT_X1.metadata,
    createdAt,
    updatedAt,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitInstanceService,
        { provide: getRepositoryToken(UnitInstance), useValue: unitInstanceRepository },
        { provide: UnitCatalogService, useValue: unitCatalogService },
        { provide: PlayersService, useValue: playersService },
      ],
    }).compile();

    service = module.get(UnitInstanceService);
    unitInstanceRepository.find.mockResolvedValue([instance]);
    unitCatalogService.getUnitTypeById.mockResolvedValue(unitType);
  });

  it('lists instances by owner with embedded type', async () => {
    await expect(service.listByOwner(ownerId)).resolves.toEqual([
      expect.objectContaining({
        id: instance.id,
        typeId: SCOUT_X1.id,
        ownerId,
        location,
        status: 'inactive',
        type: expect.objectContaining({
          id: SCOUT_X1.id,
          name: SCOUT_X1.name,
        }),
      }),
    ]);

    expect(unitInstanceRepository.find).toHaveBeenCalledWith({
      where: { ownerId },
      order: { createdAt: 'ASC' },
    });
  });

  it('lists instances by planet at planet depth only', async () => {
    await service.listByPlanet(planetId);

    expect(unitInstanceRepository.find).toHaveBeenCalledWith({
      where: { placeLevel: 'planet', planetId },
      order: { createdAt: 'ASC' },
    });
  });

  it('lists instances by star system at starSystem depth only', async () => {
    await service.listByStarSystem(starSystemId);

    expect(unitInstanceRepository.find).toHaveBeenCalledWith({
      where: { placeLevel: 'starSystem', starSystemId },
      order: { createdAt: 'ASC' },
    });
  });

  it('throws when admin owner lookup misses a player', async () => {
    playersService.findById.mockResolvedValue(null);

    await expect(service.listByOwnerForAdmin(ownerId)).rejects.toThrow(NotFoundException);
  });

  it('skips instances whose catalog type is missing', async () => {
    unitCatalogService.getUnitTypeById.mockResolvedValue(null);

    await expect(service.listByOwner(ownerId)).resolves.toEqual([]);
    expect(Logger.prototype.warn).toHaveBeenCalled();
  });

  it('creates a planet unit with denormalized location fields', async () => {
    const createdInstance = { ...instance, status: 'active' as const };
    unitInstanceRepository.create.mockReturnValue(createdInstance);
    unitInstanceRepository.save.mockResolvedValue(createdInstance);

    await expect(
      service.createPlanetUnit({
        ownerId,
        typeId: SCOUT_X1.id,
        cubeId,
        starSystemId,
        planetId,
        hex_coords: { q: 12, r: 7 },
        position: { x: 0.35, y: 0.72 },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: instance.id,
        typeId: SCOUT_X1.id,
        ownerId,
        location,
        status: 'active',
      }),
    );

    expect(unitInstanceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: SCOUT_X1.id,
        ownerId,
        placeLevel: 'planet',
        cubeId,
        planetId,
        starSystemId: null,
        status: 'active',
      }),
    );
    expect(unitInstanceRepository.save).toHaveBeenCalledWith(createdInstance);
  });
});
