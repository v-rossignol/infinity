import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayerSpawnService } from './player-spawn.service';
import { PlayersService } from './players.service';

type AuthenticatedRequest = Request & {
  user: { id: string; username: string };
};

@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly playerSpawnService: PlayerSpawnService,
  ) {}

  @Post('me/enter-game')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async enterGame(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    let player = await this.playersService.findByUserId(userId);
    if (!player) {
      player = await this.playersService.createForUser(userId);
    }
    return this.playerSpawnService.bootstrapPlayer(player);
  }

  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    let player = await this.playersService.findByUserId(userId);
    if (!player) {
      player = await this.playersService.createForUser(userId);
    }
    return player;
  }
}
