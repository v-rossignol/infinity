import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HexCoords, Vec2Local } from '../../shared/interfaces/player-location.interface';
import { UnitInstanceWithType } from '../../shared/interfaces/unit-instance.interface';
import { buildUnitPlanetLocation, isPlayerLocationOnPlanet } from '../../shared/utils/player-location';
import { computeDenormalizedFields } from '../../shared/utils/unit-instance-location';
import { hexDistance } from '../../shared/utils/hex-grid';
import { computePlanetSurfaceTravelDistance, computePlanetSurfaceTravelMs } from '../../shared/utils/planet-surface-travel';
import { UnitInstance } from './entities/unit-instance.entity';
import { UnitCatalogService } from './unit-catalog.service';
import { MoveUnitDto } from './dto/move-unit.dto';

export interface UnitMovementArrivedEvent {
  unitId: string;
  planetId: string;
  unit: UnitInstanceWithType;
}

export const UNIT_MOVEMENT_EVENTS = {
  ARRIVED: 'unit.movement.arrived',
} as const;

interface MovementMetadata {
  targetHex: HexCoords;
  targetPosition: Vec2Local;
  startedAt: string;
  arrivalAt: string;
}

export interface MoveSurfacePoint {
  hex: HexCoords;
  position: Vec2Local;
}

export interface MoveOrderResult {
  unitId: string;
  status: 'moving';
  /** Temporary debug field — may be removed. */
  startAt: string;
  arrivalAt: string;
  /** Temporary debug field — may be removed. */
  origin: MoveSurfacePoint;
  /** Temporary debug field — may be removed. */
  destination: MoveSurfacePoint;
  /** Temporary debug field. Surface travel distance in hex units (1 = largest intra-hex distance). */
  distance: number;
}

@Injectable()
export class UnitMovementService {
  private readonly logger = new Logger(UnitMovementService.name);

  constructor(
    @InjectRepository(UnitInstance)
    private readonly unitInstanceRepository: Repository<UnitInstance>,
    private readonly unitCatalogService: UnitCatalogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async orderMove(playerId: string, unitId: string, dto: MoveUnitDto): Promise<MoveOrderResult> {
    const unit = await this.unitInstanceRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unit "${unitId}" not found`);
    }

    if (unit.ownerId !== playerId) {
      throw new ForbiddenException('You do not own this unit');
    }

    if (unit.placeLevel !== 'planet' || unit.planetId !== dto.planetId) {
      throw new UnprocessableEntityException('Unit is not on the specified planet');
    }

    if (unit.status === 'moving') {
      throw new ConflictException('Unit is already moving');
    }

    const unitType = await this.unitCatalogService.getUnitTypeById(unit.typeId);
    if (!unitType) {
      throw new NotFoundException(`Unit type "${unit.typeId}" not found in catalog`);
    }

    if (!unitType.mobility) {
      throw new UnprocessableEntityException('This unit type cannot move');
    }

    const currentLocation = unit.location;
    if (!isPlayerLocationOnPlanet(currentLocation) || !currentLocation.planet.hex_coords) {
      throw new UnprocessableEntityException('Unit does not have a valid planet hex position');
    }

    const currentHex = currentLocation.planet.hex_coords;
    const hexStepDistance = hexDistance(currentHex, dto.targetHex);

    const rangeRule = unitType.rules.find((r) => r.range === 'hexagon');
    const maxRange = rangeRule?.value ?? 1;

    if (hexStepDistance > maxRange) {
      throw new UnprocessableEntityException(
        `Target hex is out of range (distance ${hexStepDistance}, max ${maxRange})`,
      );
    }

    const targetPosition: Vec2Local = dto.targetPosition ?? { x: 0.5, y: 0.5 };
    const currentPosition: Vec2Local = currentLocation.planet.position ?? { x: 0.5, y: 0.5 };
    const speed = unitType.speed ?? 1;
    const origin: MoveSurfacePoint = { hex: currentHex, position: currentPosition };
    const destination: MoveSurfacePoint = { hex: dto.targetHex, position: targetPosition };
    const distance = computePlanetSurfaceTravelDistance(origin, destination);
    const travelMs = computePlanetSurfaceTravelMs(origin, destination, speed);

    const startedAt = new Date();
    const arrivalAt = new Date(startedAt.getTime() + travelMs);

    const movement: MovementMetadata = {
      targetHex: dto.targetHex,
      targetPosition,
      startedAt: startedAt.toISOString(),
      arrivalAt: arrivalAt.toISOString(),
    };

    await this.unitInstanceRepository.update(unitId, {
      status: 'moving',
      metadata: { ...unit.metadata, movement },
    });

    setTimeout(() => {
      this.onArrival(unitId, dto.planetId, dto.targetHex, targetPosition).catch((err) => {
        this.logger.error(`onArrival failed for unit "${unitId}": ${String(err)}`);
      });
    }, Math.max(0, arrivalAt.getTime() - Date.now()));

    this.logger.log(`Unit "${unitId}" moving to hex (${dto.targetHex.q},${dto.targetHex.r}), arriving in ${travelMs}ms`);

    return {
      unitId,
      status: 'moving',
      startAt: startedAt.toISOString(),
      arrivalAt: arrivalAt.toISOString(),
      origin,
      destination,
      distance,
    };
  }

  private async onArrival(
    unitId: string,
    planetId: string,
    targetHex: HexCoords,
    targetPosition: Vec2Local,
  ): Promise<void> {
    const unit = await this.unitInstanceRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      this.logger.warn(`onArrival: unit "${unitId}" not found, skipping`);
      return;
    }

    if (unit.status !== 'moving') {
      this.logger.warn(`onArrival: unit "${unitId}" is no longer moving (status: ${unit.status}), skipping`);
      return;
    }

    const existingLocation = unit.location;
    if (!isPlayerLocationOnPlanet(existingLocation)) {
      this.logger.warn(`onArrival: unit "${unitId}" is no longer at planet depth, skipping`);
      return;
    }

    const newLocation = buildUnitPlanetLocation({
      cubeId: existingLocation.cube.id,
      starSystemId: existingLocation.starSystem.id,
      planetId,
      hex_coords: targetHex,
      position: targetPosition,
    });

    const denormalized = computeDenormalizedFields(newLocation);

    const { movement: _movement, ...rest } = unit.metadata as Record<string, unknown>;

    unit.location = newLocation;
    unit.status = 'idle';
    unit.metadata = rest;
    unit.placeLevel = denormalized.placeLevel;
    unit.cubeId = denormalized.cubeId;
    unit.starSystemId = denormalized.starSystemId;
    unit.planetId = denormalized.planetId;

    await this.unitInstanceRepository.save(unit);

    const updatedUnit = await this.unitInstanceRepository.findOne({ where: { id: unitId } });
    const unitType = updatedUnit
      ? await this.unitCatalogService.getUnitTypeById(updatedUnit.typeId)
      : null;

    if (!updatedUnit || !unitType) {
      this.logger.warn(`onArrival: could not reload unit "${unitId}" after update`);
      return;
    }

    const unitWithType: UnitInstanceWithType = {
      id: updatedUnit.id,
      typeId: updatedUnit.typeId,
      ownerId: updatedUnit.ownerId,
      location: updatedUnit.location,
      status: updatedUnit.status,
      createdAt: updatedUnit.createdAt.toISOString(),
      updatedAt: updatedUnit.updatedAt.toISOString(),
      metadata: updatedUnit.metadata,
      type: {
        id: unitType.id,
        name: unitType.name,
        type: unitType.type,
        size: unitType.size,
        mobility: unitType.mobility,
        speed: unitType.speed,
        environments: unitType.environments,
        rules: unitType.rules,
        capabilities: unitType.capabilities,
        description: unitType.description,
        metadata: unitType.metadata,
      },
    };

    const event: UnitMovementArrivedEvent = { unitId, planetId, unit: unitWithType };
    this.eventEmitter.emit(UNIT_MOVEMENT_EVENTS.ARRIVED, event);

    this.logger.log(`Unit "${unitId}" arrived at hex (${targetHex.q},${targetHex.r}) on planet "${planetId}"`);
  }
}
