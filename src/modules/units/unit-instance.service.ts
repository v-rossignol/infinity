import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HexCoords, Vec2Local } from '../../shared/interfaces/player-location.interface';
import { UnitInstanceWithType } from '../../shared/interfaces/unit-instance.interface';
import { UnitTypeDefinition } from '../../shared/interfaces/unit-type.interface';
import { buildUnitPlanetLocation } from '../../shared/utils/player-location';
import { computeDenormalizedFields } from '../../shared/utils/unit-instance-location';
import { PlayersService } from '../players/players.service';
import { UnitInstance } from './entities/unit-instance.entity';
import { UnitType } from './entities/unit-type.entity';
import { UnitCatalogService } from './unit-catalog.service';

@Injectable()
export class UnitInstanceService {
  private readonly logger = new Logger(UnitInstanceService.name);

  constructor(
    @InjectRepository(UnitInstance)
    private readonly unitInstanceRepository: Repository<UnitInstance>,
    private readonly unitCatalogService: UnitCatalogService,
    private readonly playersService: PlayersService,
  ) {}

  async listByOwner(ownerId: string): Promise<UnitInstanceWithType[]> {
    const instances = await this.unitInstanceRepository.find({
      where: { ownerId },
      order: { createdAt: 'ASC' },
    });

    return this.mapInstancesWithType(instances);
  }

  async listByPlanet(planetId: string): Promise<UnitInstanceWithType[]> {
    const instances = await this.unitInstanceRepository.find({
      where: { placeLevel: 'planet', planetId },
      order: { createdAt: 'ASC' },
    });

    return this.mapInstancesWithType(instances);
  }

  async listByStarSystem(starSystemId: string): Promise<UnitInstanceWithType[]> {
    const instances = await this.unitInstanceRepository.find({
      where: { placeLevel: 'starSystem', starSystemId },
      order: { createdAt: 'ASC' },
    });

    return this.mapInstancesWithType(instances);
  }

  async listByOwnerForAdmin(ownerId: string): Promise<UnitInstanceWithType[]> {
    const player = await this.playersService.findById(ownerId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return this.listByOwner(ownerId);
  }

  async createPlanetUnit(params: {
    ownerId: string;
    typeId: string;
    cubeId: string;
    starSystemId: string;
    planetId: string;
    hex_coords: HexCoords;
    position: Vec2Local;
  }): Promise<UnitInstanceWithType> {
    const unitType = await this.unitCatalogService.getUnitTypeById(params.typeId);
    if (!unitType) {
      throw new NotFoundException(`Unit type "${params.typeId}" not found`);
    }

    const location = buildUnitPlanetLocation({
      cubeId: params.cubeId,
      starSystemId: params.starSystemId,
      planetId: params.planetId,
      hex_coords: params.hex_coords,
      position: params.position,
    });
    const denormalized = computeDenormalizedFields(location);

    const instance = this.unitInstanceRepository.create({
      typeId: params.typeId,
      ownerId: params.ownerId,
      location,
      status: 'active',
      metadata: {},
      ...denormalized,
    });

    const saved = await this.unitInstanceRepository.save(instance);
    return this.toUnitInstanceWithType(saved, unitType);
  }

  private async mapInstancesWithType(
    instances: UnitInstance[],
  ): Promise<UnitInstanceWithType[]> {
    const results: UnitInstanceWithType[] = [];

    for (const instance of instances) {
      const unitType = await this.unitCatalogService.getUnitTypeById(instance.typeId);
      if (!unitType) {
        this.logger.warn(
          `Skipping unit instance "${instance.id}": catalog type "${instance.typeId}" not found`,
        );
        continue;
      }

      results.push(this.toUnitInstanceWithType(instance, unitType));
    }

    return results;
  }

  private toUnitInstanceWithType(
    instance: UnitInstance,
    unitType: UnitType,
  ): UnitInstanceWithType {
    return {
      id: instance.id,
      typeId: instance.typeId,
      ownerId: instance.ownerId,
      location: instance.location,
      status: instance.status,
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
      metadata: instance.metadata,
      type: this.toUnitTypeDefinition(unitType),
    };
  }

  private toUnitTypeDefinition(unitType: UnitType): UnitTypeDefinition {
    return {
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
    };
  }
}
