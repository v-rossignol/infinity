import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  getPlanetPositionRedisKey,
  PLANET_CONSTANTS,
} from '../../shared/constants/planet.constants';
import { PlanetHexPosition, PlanetMovePayload } from '../../shared/interfaces/planet-position.interface';
import { generatePlanetSurface } from '../../shared/utils/planet-surface-generation';
import { RedisService } from '../redis/redis.service';
import { StarSystemService } from '../galaxy/star-system.service';
import { Planet } from './entities/planet.schema';

@Injectable()
export class PlanetsService {
  constructor(
    @InjectModel(Planet.name)
    private planetModel: Model<Planet>,
    private readonly starSystemService: StarSystemService,
    private readonly redisService: RedisService,
  ) {}

  async getPlanet(planetId: string, starSystemId?: string) {
    const existing = await this.planetModel.findById(planetId).exec();
    if (existing) {
      return existing;
    }

    return this.createPlanetFromSummary(planetId, starSystemId);
  }

  async joinPlanet(playerId: string, planetId: string) {
    const cached = await this.getCachedPosition(planetId, playerId);
    if (cached) {
      return { planetId, ...cached };
    }

    const planet = await this.planetModel.findById(planetId).exec();
    if (!planet) {
      throw new NotFoundException(
        `Planet "${planetId}" not found — load it via REST before joining`,
      );
    }

    const position = this.rollRandomPosition(planet.radius);
    await this.savePosition(planetId, playerId, position);
    return { planetId, ...position };
  }

  async handlePlayerMove(playerId: string, payload: PlanetMovePayload) {
    const position = { q: payload.q, r: payload.r };
    await this.savePosition(payload.planetId, playerId, position);
    return { planetId: payload.planetId, ...position };
  }

  private async createPlanetFromSummary(planetId: string, starSystemId?: string) {
    if (!starSystemId) {
      throw new BadRequestException('systemId is required on first planet entry');
    }

    const system = await this.starSystemService.getStarSystem(starSystemId);
    const summary = system.planets.find((planet) => planet.id === planetId);
    if (!summary) {
      throw new NotFoundException(
        `Planet "${planetId}" not found in star system "${starSystemId}"`,
      );
    }

    if (summary.type === 'gas') {
      throw new UnprocessableEntityException('Gas planets have no enterable surface');
    }

    const surface = generatePlanetSurface({ seed: planetId, radius: summary.radius });
    const planet = new this.planetModel({
      _id: summary.id,
      name: summary.name,
      starSystemId,
      type: summary.type,
      radius: summary.radius,
      resources: summary.resources,
      surface,
    });

    return planet.save();
  }

  private rollRandomPosition(radius: number): PlanetHexPosition {
    return {
      q: Math.floor(Math.random() * radius),
      r: Math.floor(Math.random() * radius),
    };
  }

  private async getCachedPosition(
    planetId: string,
    playerId: string,
  ): Promise<PlanetHexPosition | null> {
    const raw = await this.redisService.get(getPlanetPositionRedisKey(planetId, playerId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PlanetHexPosition;
  }

  private async savePosition(
    planetId: string,
    playerId: string,
    position: PlanetHexPosition,
  ): Promise<void> {
    await this.redisService.set(
      getPlanetPositionRedisKey(planetId, playerId),
      JSON.stringify(position),
      PLANET_CONSTANTS.POSITION_TTL_SECONDS,
    );
  }
}
