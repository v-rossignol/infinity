import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SPAWN_CONSTANTS } from '../../shared/constants/spawn.constants';
import { CubeWithStars } from '../../shared/interfaces/galaxy.interface';
import { buildPlanetLocation, isFreshy } from '../../shared/utils/player-location';
import { NoEmptyCubeSlotError } from '../../shared/utils/spawn-cube-selection';
import {
  NoRockyPlanetError,
  NoStarsInCubeError,
  pickLargestRockyPlanet,
  pickRandomStar,
} from '../../shared/utils/spawn-selection';
import { CubeService } from '../galaxy/cube.service';
import { StarSystemService } from '../systems/star-system.service';
import { PlanetsService } from '../planets/planets.service';
import { Player } from './entities/player.entity';
import { PlayerLocationService } from './player-location.service';

export interface EnterGameResult {
  player: Player;
}

@Injectable()
export class PlayerSpawnService {
  constructor(
    private readonly playerLocationService: PlayerLocationService,
    private readonly cubeService: CubeService,
    private readonly starSystemService: StarSystemService,
    private readonly planetsService: PlanetsService,
  ) {}

  async bootstrapPlayer(player: Player): Promise<EnterGameResult> {
    if (!isFreshy(player)) {
      return { player };
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

  private async allocateNewSpawn(player: Player): Promise<EnterGameResult> {
    const origin = await this.cubeService.pickSpawnCubeOrigin();
    const cubeWithStars = await this.cubeService.getOrCreateByOrigin(origin);
    return this.allocateInCube(player, cubeWithStars);
  }

  private async allocateInCube(
    player: Player,
    cubeWithStars: CubeWithStars,
  ): Promise<EnterGameResult> {
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
      const surfacePos = this.planetsService.rollRandomPosition(planet.radius);

      const location = buildPlanetLocation({
        cubeId: cube.id,
        starSystemId: star.id,
        planetId: planet._id,
        hex_coords: surfacePos,
      });

      const updatedPlayer = await this.playerLocationService.setLocation(player.id, location);

      return { player: updatedPlayer };
    }

    throw new NoRockyPlanetError();
  }
}
