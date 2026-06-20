import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HexagonResource, HexBiome } from '../../shared/interfaces/planet.interface';
import { resolveHexResources } from '../../shared/utils/hex-resources';
import { PlanetPreviewCacheService } from '../planets/planet-preview-cache.service';
import { Planet } from '../planets/entities/planet.schema';
import { Resource } from './entities/resource.schema';

export interface PlanetHexResourcesResponse {
  planetId: string;
  coordinates: { q: number; r: number };
  biome: string;
  resources: HexagonResource[];
}

@Injectable()
export class ResourcesService {
  constructor(
    @InjectModel(Resource.name)
    private resourceModel: Model<Resource>,
    @InjectModel(Planet.name)
    private planetModel: Model<Planet>,
    private readonly planetPreviewCacheService: PlanetPreviewCacheService,
  ) {}

  async findByPlanetId(planetId: string) {
    const preview = await this.planetPreviewCacheService.getById(planetId);
    if (preview) {
      return [];
    }

    return this.resourceModel.find({ planetId }).exec();
  }

  async findByPlanetHex(
    planetId: string,
    q: number,
    r: number,
  ): Promise<PlanetHexResourcesResponse> {
    const planet = await this.resolvePlanetSurface(planetId);
    if (!planet) {
      throw new NotFoundException(`Planet "${planetId}" not found`);
    }

    const hex = planet.surface.hexagons.find(
      (cell) => cell.coordinates.q === q && cell.coordinates.r === r,
    );
    if (!hex) {
      throw new NotFoundException(`Hex (${q}, ${r}) not found on planet "${planetId}"`);
    }

    return {
      planetId,
      coordinates: { q, r },
      biome: hex.biome,
      resources: resolveHexResources(hex.biome as HexBiome),
    };
  }

  private async resolvePlanetSurface(planetId: string) {
    const planet = await this.planetModel.findById(planetId).exec();
    if (planet) {
      return planet;
    }

    return this.planetPreviewCacheService.getById(planetId);
  }

  parseHexCoordinate(value: string, field: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a non-negative integer`);
    }

    return parsed;
  }

  async harvest(resourceId: string, amount: number) {
    const resource = await this.resourceModel.findById(resourceId).exec();
    if (!resource) {
      return null;
    }
    resource.quantity = Math.max(0, resource.quantity - amount);
    return resource.save();
  }
}
