import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayerLocationService } from './player-location.service';
import { PlayersService } from './players.service';

type AuthenticatedRequest = Request & {
  user: { id: string; username: string; role?: string };
};

@Controller('players/me/can-enter')
@UseGuards(JwtAuthGuard)
export class PlayerCanEnterController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly playerLocationService: PlayerLocationService,
  ) {}

  @Get('cube/:cubeId')
  async canEnterCube(@Req() req: AuthenticatedRequest, @Param('cubeId') cubeId: string) {
    const player = await this.resolvePlayer(req.user.id);
    const canEnter = await this.playerLocationService.canEnterCube(player.id, cubeId, {
      isAdmin: req.user.role === 'admin',
    });
    return { canEnter };
  }

  @Get('system/:starSystemId')
  async canEnterStarSystem(
    @Req() req: AuthenticatedRequest,
    @Param('starSystemId') starSystemId: string,
  ) {
    const player = await this.resolvePlayer(req.user.id);
    const canEnter = await this.playerLocationService.canEnterStarSystem(player.id, starSystemId, {
      isAdmin: req.user.role === 'admin',
    });
    return { canEnter };
  }

  @Get('planet/:planetId')
  async canEnterPlanet(@Req() req: AuthenticatedRequest, @Param('planetId') planetId: string) {
    const player = await this.resolvePlayer(req.user.id);
    const canEnter = await this.playerLocationService.canEnterPlanet(player.id, planetId, {
      isAdmin: req.user.role === 'admin',
    });
    return { canEnter };
  }

  private async resolvePlayer(userId: string) {
    const player = await this.playersService.findByUserId(userId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }
}
