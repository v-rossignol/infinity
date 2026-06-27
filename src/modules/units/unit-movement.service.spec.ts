import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { buildUnitPlanetLocation } from '../../shared/utils/player-location';
import { Planet } from '../planets/entities/planet.schema';
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

  const planetModel = {
    findById: jest.fn(),
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

  function buildIdleUnit(hex_coords: { q: number; r: number }): UnitInstance {
    return {
      id: unitId,
      typeId: SCOUT_X1.id,
      unitType: {} as UnitType,
      ownerId,
      owner: {} as never,
      location: buildUnitPlanetLocation({
        cubeId,
        starSystemId,
        planetId,
        hex_coords,
        position: { x: 0.5, y: 0.5 },
      }),
      placeLevel: 'planet',
      cubeId,
      starSystemId,
      planetId,
      status: 'idle',
      metadata: {},
      createdAt,
      updatedAt,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-01-01T00:05:00.000Z'));
    planetModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ radius: 13 }),
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitMovementService,
        { provide: getRepositoryToken(UnitInstance), useValue: unitInstanceRepository },
        { provide: UnitCatalogService, useValue: unitCatalogService },
        { provide: getModelToken(Planet.name), useValue: planetModel },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(UnitMovementService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('orderMove', () => {
    it('allows a toroidally adjacent target that is far in flat axial distance', async () => {
      const unit = buildIdleUnit({ q: 8, r: 0 });
      unitInstanceRepository.findOne.mockResolvedValue(unit);
      unitInstanceRepository.update.mockResolvedValue(undefined);
      unitCatalogService.getUnitTypeById.mockResolvedValue(unitType);

      await expect(
        service.orderMove(ownerId, unitId, {
          planetId,
          targetHex: { q: 8, r: 13 },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          unitId,
          status: 'moving',
        }),
      );

      expect(unitInstanceRepository.update).toHaveBeenCalled();
    });

    it('rejects a target outside toroidal move range', async () => {
      const unit = buildIdleUnit({ q: 8, r: 0 });
      unitInstanceRepository.findOne.mockResolvedValue(unit);
      unitCatalogService.getUnitTypeById.mockResolvedValue(unitType);

      await expect(
        service.orderMove(ownerId, unitId, {
          planetId,
          targetHex: { q: 8, r: 11 },
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
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
