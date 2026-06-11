import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SPAWN_CONSTANTS } from '../../shared/constants/spawn.constants';
import { CubeData, CubeWithStars, StarData } from '../../shared/interfaces/galaxy.interface';
import { localToGlobal } from '../../shared/utils/coordinates';
import { NoEmptyCubeSlotError } from '../../shared/utils/spawn-cube-selection';
import {
  NoRockyPlanetError,
  NoStarsInCubeError,
  pickLargestRockyPlanet,
  pickRandomStar,
} from '../../shared/utils/spawn-selection';
import { CubeService } from '../galaxy/cube.service';
import { StarService } from '../galaxy/star.service';
import { StarSystemService } from '../galaxy/star-system.service';
import { Planet } from '../planets/entities/planet.schema';
import { PlanetsService } from '../planets/planets.service';
import { Player } from './entities/player.entity';
import { PlayersService } from './players.service';

export interface SpawnResult {
  player: Player;
  cube: CubeData;
  star: StarData;
  starSystemId: string;
  planet: Planet;
  surfacePosition: { q: number; r: number };
}

@Injectable()
export class PlayerSpawnService {
  constructor(
    private readonly playersService: PlayersService,
    private readonly cubeService: CubeService,
    private readonly starSystemService: StarSystemService,
    private readonly starService: StarService,
    private readonly planetsService: PlanetsService,
  ) {}

  async bootstrapPlayer(player: Player): Promise<SpawnResult> {
    if (player.currentPlanetId) {
      return this.buildExistingSpawnResult(player);
    }

    for (let attempt = 0; attempt < SPAWN_CONSTANTS.SPAWN_FULL_ATTEMPTS; attempt++) {
      try {
        return await this.allocateNewSpawn(player);
      } catch (error) {
        if (!this.isRetriableSpawnError(error)) {
          throw error;
        }
      }
    }

    throw new ServiceUnavailableException('Unable to allocate spawn location');
  }

  private isRetriableSpawnError(error: unknown): boolean {
    return (
      error instanceof NoEmptyCubeSlotError ||
      error instanceof NoRockyPlanetError ||
      error instanceof NoStarsInCubeError
    );
  }

  private async allocateNewSpawn(player: Player): Promise<SpawnResult> {
    const origin = await this.cubeService.pickSpawnCubeOrigin();
    const cubeWithStars = await this.cubeService.getOrCreateByOrigin(origin);
    return this.allocateInCube(player, cubeWithStars);
  }

  private async allocateInCube(
    player: Player,
    cubeWithStars: CubeWithStars,
  ): Promise<SpawnResult> {
    const { cube, stars } = cubeWithStars;
    const triedStarIds = new Set<string>();

    for (let attempt = 0; attempt < SPAWN_CONSTANTS.SPAWN_STAR_ATTEMPTS; attempt++) {
      const candidates = stars.filter((star) => !triedStarIds.has(star.id));
      if (candidates.length === 0) {
        break;
      }

      const star = pickRandomStar(candidates);
      triedStarIds.add(star.id);

      let summary;
      try {
        const system = await this.starSystemService.getStarSystem(star.id);
        summary = pickLargestRockyPlanet(system.planets);
      } catch (error) {
        if (error instanceof NoRockyPlanetError) {
          continue;
        }
        throw error;
      }

      const planet = await this.planetsService.getPlanet(summary.id, star.id);
      const surfacePos = await this.planetsService.joinPlanet(player.id, planet._id);
      const globalCoords = localToGlobal(cube.origin, star.local_coords);

      const updatedPlayer = await this.playersService.updatePosition(player.id, {
        galaxyX: globalCoords.x,
        galaxyY: globalCoords.y,
        galaxyZ: globalCoords.z,
        currentPlanetId: planet._id,
        planetX: surfacePos.q,
        planetY: surfacePos.r,
      });

      return {
        player: updatedPlayer,
        cube,
        star,
        starSystemId: star.id,
        planet,
        surfacePosition: { q: surfacePos.q, r: surfacePos.r },
      };
    }

    throw new NoRockyPlanetError();
  }

  private async buildExistingSpawnResult(player: Player): Promise<SpawnResult> {
    const planetId = player.currentPlanetId;
    if (!planetId) {
      throw new NotFoundException('Player has no current planet');
    }

    const planet = await this.planetsService.getPlanet(planetId);
    const star = await this.starService.findById(planet.starSystemId);
    if (!star) {
      throw new NotFoundException(`Star "${planet.starSystemId}" not found for spawned player`);
    }

    const cube = await this.cubeService.findById(star.cube_id);
    if (!cube) {
      throw new NotFoundException(`Cube "${star.cube_id}" not found for spawned player`);
    }

    return {
      player,
      cube,
      star,
      starSystemId: star.id,
      planet,
      surfacePosition: { q: player.planetX, r: player.planetY },
    };
  }
}
