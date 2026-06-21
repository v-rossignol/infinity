import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnitInstanceService } from '../units/unit-instance.service';
import { PlayersService } from './players.service';

type AuthenticatedRequest = Request & {
  user: { id: string; username: string };
};

@Controller('players/me')
@UseGuards(JwtAuthGuard)
export class PlayerUnitsController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly unitInstanceService: UnitInstanceService,
  ) {}

  @Get('units')
  async listMyUnits(@Req() req: AuthenticatedRequest) {
    const player = await this.playersService.findByUserId(req.user.id);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return this.unitInstanceService.listByOwner(player.id);
  }
}
