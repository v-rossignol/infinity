import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HexCoords,
  LocationTransition,
  PlayerLocation,
  Vec2Local,
  Vec3Local,
} from '../../shared/interfaces/player-location.interface';
import {
  assertValidLocation,
  buildCubeLocation,
  buildPlanetLocation,
  buildStarSystemLocation,
  InvalidPlayerLocationError,
  isPlayerLocationInCube,
  isPlayerLocationInStarSystem,
  isPlayerLocationOnPlanet,
} from '../../shared/utils/player-location';
import { StarService } from '../galaxy/star.service';
import { StarSystemService } from '../galaxy/star-system.service';
import { parseStarSystemIdFromPlanetId } from '../../shared/utils/planet-id';
import { Player } from './entities/player.entity';

export interface LocationTransitionOptions {
  adminBypass?: boolean;
}

@Injectable()
export class PlayerLocationService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    private readonly starService: StarService,
    private readonly starSystemService: StarSystemService,
  ) {}

  async getLocation(playerId: string): Promise<PlayerLocation | null> {
    const player = await this.findPlayerOrThrow(playerId);
    return player.location;
  }

  async setLocation(playerId: string, location: PlayerLocation | null): Promise<Player> {
    const player = await this.findPlayerOrThrow(playerId);

    if (location === null) {
      player.location = null;
      return this.playersRepository.save(player);
    }

    return this.saveLocation(player, location);
  }

  async updateCubePosition(playerId: string, position: Vec3Local): Promise<Player> {
    const player = await this.findPlayerOrThrow(playerId);

    if (!player.location || !isPlayerLocationInCube(player.location)) {
      throw new ConflictException('Player is not at cube depth');
    }

    const location = buildCubeLocation({
      cubeId: player.location.cube.id,
      position,
    });

    return this.saveLocation(player, location);
  }

  async updateStarSystemPosition(playerId: string, position: Vec2Local): Promise<Player> {
    const player = await this.findPlayerOrThrow(playerId);

    if (!player.location || !isPlayerLocationInStarSystem(player.location)) {
      throw new ConflictException('Player is not at star system depth');
    }

    const location = buildStarSystemLocation({
      cubeId: player.location.cube.id,
      starSystemId: player.location.starSystem.id,
      position,
    });

    return this.saveLocation(player, location);
  }

  async updatePlanetHex(playerId: string, hex_coords: HexCoords): Promise<Player> {
    const player = await this.findPlayerOrThrow(playerId);

    if (!player.location || !isPlayerLocationOnPlanet(player.location)) {
      throw new ConflictException('Player is not at planet depth');
    }

    const location = buildPlanetLocation({
      cubeId: player.location.cube.id,
      starSystemId: player.location.starSystem.id,
      planetId: player.location.planet.id,
      hex_coords,
    });

    return this.saveLocation(player, location);
  }

  async transitionTo(
    playerId: string,
    transition: LocationTransition,
    options?: LocationTransitionOptions,
  ): Promise<Player> {
    const player = await this.findPlayerOrThrow(playerId);

    switch (transition.type) {
      case 'enterStarSystem':
        return this.transitionEnterStarSystem(player, transition, options);
      case 'enterPlanet':
        return this.transitionEnterPlanet(player, transition, options);
      case 'leavePlanet':
        return this.transitionLeavePlanet(player, transition);
      case 'leaveStarSystem':
        return this.transitionLeaveStarSystem(player, transition);
      default: {
        const exhaustive: never = transition;
        throw new BadRequestException(`Unknown transition type: ${String(exhaustive)}`);
      }
    }
  }

  private transitionEnterStarSystem(
    player: Player,
    transition: Extract<LocationTransition, { type: 'enterStarSystem' }>,
    options?: LocationTransitionOptions,
  ): Promise<Player> {
    if (options?.adminBypass) {
      return this.adminRelocateToStarSystem(player, transition);
    }

    if (!player.location || !isPlayerLocationInCube(player.location)) {
      throw new ConflictException('Player must be at cube depth to enter a star system');
    }

    const location = buildStarSystemLocation({
      cubeId: player.location.cube.id,
      starSystemId: transition.starSystemId,
      position: transition.position,
    });

    return this.saveLocation(player, location);
  }

  private async adminRelocateToStarSystem(
    player: Player,
    transition: Extract<LocationTransition, { type: 'enterStarSystem' }>,
  ): Promise<Player> {
    const star = await this.starService.findById(transition.starSystemId);
    if (!star) {
      throw new NotFoundException(`Star "${transition.starSystemId}" not found`);
    }

    await this.starSystemService.getStarSystem(transition.starSystemId);

    const location = buildStarSystemLocation({
      cubeId: star.cube_id,
      starSystemId: transition.starSystemId,
      position: transition.position,
    });

    return this.saveLocation(player, location);
  }

  private transitionEnterPlanet(
    player: Player,
    transition: Extract<LocationTransition, { type: 'enterPlanet' }>,
    options?: LocationTransitionOptions,
  ): Promise<Player> {
    if (options?.adminBypass) {
      return this.adminRelocateToPlanet(player, transition);
    }

    if (!player.location || !isPlayerLocationInStarSystem(player.location)) {
      throw new ConflictException('Player must be at star system depth to enter a planet');
    }

    const location = buildPlanetLocation({
      cubeId: player.location.cube.id,
      starSystemId: player.location.starSystem.id,
      planetId: transition.planetId,
      hex_coords: transition.hex_coords,
    });

    return this.saveLocation(player, location);
  }

  private async adminRelocateToPlanet(
    player: Player,
    transition: Extract<LocationTransition, { type: 'enterPlanet' }>,
  ): Promise<Player> {
    const starSystemId = parseStarSystemIdFromPlanetId(transition.planetId);
    if (!starSystemId) {
      throw new BadRequestException(`Invalid planet id format: "${transition.planetId}"`);
    }

    const star = await this.starService.findById(starSystemId);
    if (!star) {
      throw new NotFoundException(`Star "${starSystemId}" not found`);
    }

    const system = await this.starSystemService.getStarSystem(starSystemId);
    const summary = system.planets.find((planet) => planet.id === transition.planetId);
    if (!summary) {
      throw new NotFoundException(
        `Planet "${transition.planetId}" not found in star system "${starSystemId}"`,
      );
    }

    if (summary.type === 'gas') {
      throw new UnprocessableEntityException('Gas planets have no enterable surface');
    }

    const location = buildPlanetLocation({
      cubeId: star.cube_id,
      starSystemId,
      planetId: transition.planetId,
      hex_coords: transition.hex_coords,
    });

    return this.saveLocation(player, location);
  }

  private transitionLeavePlanet(
    player: Player,
    transition: Extract<LocationTransition, { type: 'leavePlanet' }>,
  ): Promise<Player> {
    if (!player.location || !isPlayerLocationOnPlanet(player.location)) {
      throw new ConflictException('Player must be at planet depth to leave a planet');
    }

    const location = buildStarSystemLocation({
      cubeId: player.location.cube.id,
      starSystemId: player.location.starSystem.id,
      position: transition.position,
    });

    return this.saveLocation(player, location);
  }

  private transitionLeaveStarSystem(
    player: Player,
    transition: Extract<LocationTransition, { type: 'leaveStarSystem' }>,
  ): Promise<Player> {
    if (!player.location || !isPlayerLocationInStarSystem(player.location)) {
      throw new ConflictException('Player must be at star system depth to leave a star system');
    }

    const location = buildCubeLocation({
      cubeId: player.location.cube.id,
      position: transition.position,
    });

    return this.saveLocation(player, location);
  }

  private async saveLocation(player: Player, location: PlayerLocation): Promise<Player> {
    try {
      assertValidLocation(location);
    } catch (error) {
      this.rethrowLocationError(error);
    }

    player.location = location;
    return this.playersRepository.save(player);
  }

  private async findPlayerOrThrow(playerId: string): Promise<Player> {
    const player = await this.playersRepository.findOneBy({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }
    return player;
  }

  private rethrowLocationError(error: unknown): never {
    if (error instanceof InvalidPlayerLocationError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
