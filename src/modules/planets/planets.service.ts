import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlanetHexPosition,
  PlanetMovePayload,
} from '../../shared/interfaces/planet-position.interface';
import { PlanetType } from '../../shared/interfaces/planet.interface';
import {
  buildPlanetLocation,
  hasPlanetHex,
  isPlayerLocationOnPlanet,
} from '../../shared/utils/player-location';
import {
  generatePlanetSurface,
  getPlanetGridHeight,
} from '../../shared/utils/planet-surface-generation';
import { StarService } from '../galaxy/star.service';
import { PlayerLocationService } from '../players/player-location.service';
import { StarSystemService } from '../systems/star-system.service';
import { Planet } from './entities/planet.schema';

@Injectable()
export class PlanetsService {
  constructor(
    @InjectModel(Planet.name)
    private planetModel: Model<Planet>,
    private readonly starSystemService: StarSystemService,
    private readonly starService: StarService,
    @Inject(forwardRef(() => PlayerLocationService))
    private readonly playerLocationService: PlayerLocationService,
  ) {}

  async getPlanet(planetId: string, starSystemId?: string) {
    const existing = await this.planetModel.findById(planetId).exec();
    if (existing) {
      return existing;
    }

    return this.createPlanetFromSummary(planetId, starSystemId);
  }

  async joinPlanet(playerId: string, planetId: string) {
    const planet = await this.planetModel.findById(planetId).exec();
    if (!planet) {
      throw new NotFoundException(
        `Planet "${planetId}" not found — load it via REST before joining`,
      );
    }

    const location = await this.playerLocationService.getLocation(playerId);
    if (location && isPlayerLocationOnPlanet(location)) {
      if (location.planet.id !== planetId) {
        throw new ConflictException('Player is on a different planet');
      }

      if (hasPlanetHex(location)) {
        return {
          planetId,
          q: location.planet.hex_coords.q,
          r: location.planet.hex_coords.r,
        };
      }

      return { planetId };
    }

    const star = await this.starService.findById(planet.starSystemId);
    if (!star) {
      throw new NotFoundException(`Star "${planet.starSystemId}" not found for planet join`);
    }

    await this.playerLocationService.setLocation(
      playerId,
      buildPlanetLocation({
        cubeId: star.cube_id,
        starSystemId: planet.starSystemId,
        planetId,
      }),
    );

    return { planetId };
  }

  async handlePlayerMove(playerId: string, payload: PlanetMovePayload) {
    const location = await this.playerLocationService.getLocation(playerId);
    if (!location || !isPlayerLocationOnPlanet(location)) {
      throw new ConflictException('Player is not at planet depth');
    }

    if (location.planet.id !== payload.planetId) {
      throw new ConflictException('Player is not on this planet');
    }

    await this.playerLocationService.updatePlanetHex(playerId, {
      q: payload.q,
      r: payload.r,
    });

    return { planetId: payload.planetId, q: payload.q, r: payload.r };
  }

  rollRandomPosition(radius: number): PlanetHexPosition {
    return {
      q: Math.floor(Math.random() * radius),
      r: Math.floor(Math.random() * getPlanetGridHeight(radius)),
    };
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

    const surface = generatePlanetSurface({
      seed: planetId,
      radius: summary.radius,
      type: summary.type as PlanetType,
    });
    const planet = new this.planetModel({
      _id: summary.id,
      name: summary.name,
      starSystemId,
      type: summary.type,
      radius: summary.radius,
      resources: summary.resources,
      surface,
    });

    try {
      return await planet.save();
    } catch (error) {
      // Concurrent first loads can both pass findById; the loser's insert hits E11000.
      if ((error as { code?: number }).code === 11000) {
        const raced = await this.planetModel.findById(planetId).exec();
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }
}
