import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { buildUnitPlanetLocation } from '../../shared/utils/player-location';
import { SCOUT_X1 } from './constants/unit-catalog';
import { UnitInstance } from './entities/unit-instance.entity';
import { UnitType } from './entities/unit-type.entity';
import { UNIT_MOVEMENT_EVENTS, UnitMovementService } from './unit-movement.service';
import { UnitCatalogService } from './unit-catalog.service';

describe('UnitMovementService', () => {
  let service: UnitMovementService;

  const unitInstanceRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  const unitCatalogService = {
    getUnitTypeById: jest.fn(),
  };

  const eventEmitter = {
    emit: jest.fn(),
  };

  const ownerId = '773e8400-e29b-41d4-a716-446655440003';
  const unitId = '662e8400-e29b-41d4-a716-446655440002';
  const planetId = '661e8400-e29b-41d4-a716-446655440001-p1';
  const starSystemId = '661e8400-e29b-41d4-a716-446655440001';
  const cubeId = '550e8400-e29b-41d4-a716-446655440000';

  const originLocation = buildUnitPlanetLocation({
    cubeId,
    starSystemId,
    planetId,
    hex_coords: { q: 0, r: 0 },
    position: { x: 0, y: 0.25 },
  });

  const createdAt = new Date('2026-06-21T10:00:00.000Z');
  const updatedAt = new Date('2026-06-21T10:00:00.000Z');

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

  function buildMovingUnit(): UnitInstance {
    return {
      id: unitId,
      typeId: SCOUT_X1.id,
      unitType: {} as UnitType,
      ownerId,
      owner: {} as never,
      location: originLocation,
      placeLevel: 'planet',
      cubeId,
      starSystemId,
      planetId,
      status: 'moving',
      metadata: {
        movement: {
          targetHex: { q: 0, r: 0 },
          targetPosition: { x: 1, y: 0.75 },
          startedAt: '2026-01-01T00:00:00.000Z',
          arrivalAt: '2026-01-01T00:10:00.000Z',
        },
      },
      createdAt,
      updatedAt,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-01-01T00:05:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitMovementService,
        { provide: getRepositoryToken(UnitInstance), useValue: unitInstanceRepository },
        { provide: UnitCatalogService, useValue: unitCatalogService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(UnitMovementService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('orderStop', () => {
    it('stops a moving unit at the interpolated position and emits UNIT_UPDATE', async () => {
      const movingUnit = buildMovingUnit();
      const savedUnit: UnitInstance = {
        ...movingUnit,
        status: 'idle',
        metadata: {},
        location: buildUnitPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
          hex_coords: { q: 0, r: 0 },
          position: { x: 0.5, y: 0.5 },
        }),
      };

      unitInstanceRepository.findOne
        .mockResolvedValueOnce(movingUnit)
        .mockResolvedValueOnce(movingUnit)
        .mockResolvedValueOnce(savedUnit);
      unitInstanceRepository.save.mockImplementation(async (unit: UnitInstance) => unit);
      unitCatalogService.getUnitTypeById.mockResolvedValue(unitType);

      await expect(service.orderStop(ownerId, unitId, { planetId })).resolves.toEqual({
        unitId,
        status: 'idle',
      });

      expect(unitInstanceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: unitId,
          status: 'idle',
          metadata: {},
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UNIT_MOVEMENT_EVENTS.ARRIVED,
        expect.objectContaining({
          unitId,
          planetId,
          unit: expect.objectContaining({ status: 'idle' }),
        }),
      );
    });

    it('throws ConflictException when the unit is not moving', async () => {
      unitInstanceRepository.findOne.mockResolvedValue({
        ...buildMovingUnit(),
        status: 'idle',
      });

      await expect(service.orderStop(ownerId, unitId, { planetId })).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when the caller does not own the unit', async () => {
      unitInstanceRepository.findOne.mockResolvedValue(buildMovingUnit());

      await expect(service.orderStop('other-player', unitId, { planetId })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when the unit does not exist', async () => {
      unitInstanceRepository.findOne.mockResolvedValue(null);

      await expect(service.orderStop(ownerId, unitId, { planetId })).rejects.toThrow(NotFoundException);
    });
  });
});
