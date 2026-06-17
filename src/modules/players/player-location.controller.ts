import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  EnterPlanetDto,
  EnterStarSystemDto,
  LeavePlanetDto,
  LeaveStarSystemDto,
} from './dto/location-transition.dto';
import { Vec2LocalDto, Vec3LocalDto } from './dto/local-position.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PlayerLocationService } from './player-location.service';
import { PlayersService } from './players.service';

type AuthenticatedRequest = Request & {
  user: { id: string; username: string; role?: string };
};

@Controller('players/me/location')
@UseGuards(JwtAuthGuard)
export class PlayerLocationController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly playerLocationService: PlayerLocationService,
  ) {}

  @Patch()
  async updateLocation(@Req() req: AuthenticatedRequest, @Body() dto: UpdateLocationDto) {
    const player = await this.resolvePlayer(req.user.id);
    const updated = await this.playerLocationService.setLocation(player.id, dto.location ?? null);
    return { player: updated };
  }

  @Post('enter-system')
  @HttpCode(200)
  async enterStarSystem(@Req() req: AuthenticatedRequest, @Body() dto: EnterStarSystemDto) {
    const player = await this.resolvePlayer(req.user.id);
    const updated = await this.playerLocationService.transitionTo(
      player.id,
      {
        type: 'enterStarSystem',
        starSystemId: dto.starSystemId,
        position: { x: dto.x, y: dto.y },
      },
      { adminBypass: req.user.role === 'admin' },
    );
    return { player: updated };
  }

  @Post('enter-planet')
  @HttpCode(200)
  async enterPlanet(@Req() req: AuthenticatedRequest, @Body() dto: EnterPlanetDto) {
    const player = await this.resolvePlayer(req.user.id);
    const updated = await this.playerLocationService.transitionTo(
      player.id,
      {
        type: 'enterPlanet',
        planetId: dto.planetId,
        hex_coords: { q: dto.q, r: dto.r },
      },
      { adminBypass: req.user.role === 'admin' },
    );
    return { player: updated };
  }

  @Post('leave-planet')
  @HttpCode(200)
  async leavePlanet(@Req() req: AuthenticatedRequest, @Body() dto: LeavePlanetDto) {
    const player = await this.resolvePlayer(req.user.id);
    const updated = await this.playerLocationService.transitionTo(player.id, {
      type: 'leavePlanet',
      position: { x: dto.x, y: dto.y },
    });
    return { player: updated };
  }

  @Post('leave-system')
  @HttpCode(200)
  async leaveStarSystem(@Req() req: AuthenticatedRequest, @Body() dto: LeaveStarSystemDto) {
    const player = await this.resolvePlayer(req.user.id);
    const updated = await this.playerLocationService.transitionTo(player.id, {
      type: 'leaveStarSystem',
      position: { x: dto.x, y: dto.y, z: dto.z },
    });
    return { player: updated };
  }

  @Patch('cube')
  async updateCubePosition(@Req() req: AuthenticatedRequest, @Body() dto: Vec3LocalDto) {
    const player = await this.resolvePlayer(req.user.id);
    const updated = await this.playerLocationService.updateCubePosition(player.id, {
      x: dto.x,
      y: dto.y,
      z: dto.z,
    });
    return { player: updated };
  }

  @Patch('system')
  async updateSystemPosition(@Req() req: AuthenticatedRequest, @Body() dto: Vec2LocalDto) {
    const player = await this.resolvePlayer(req.user.id);
    const updated = await this.playerLocationService.updateStarSystemPosition(player.id, {
      x: dto.x,
      y: dto.y,
    });
    return { player: updated };
  }

  private async resolvePlayer(userId: string) {
    const player = await this.playersService.findByUserId(userId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }
}
