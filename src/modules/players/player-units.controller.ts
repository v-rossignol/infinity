import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MoveUnitDto } from '../units/dto/move-unit.dto';
import { UnitInstanceService } from '../units/unit-instance.service';
import { UnitMovementService } from '../units/unit-movement.service';
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
    private readonly unitMovementService: UnitMovementService,
  ) {}

  @Get('units')
  async listMyUnits(@Req() req: AuthenticatedRequest) {
    const player = await this.playersService.findByUserId(req.user.id);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return this.unitInstanceService.listByOwner(player.id);
  }

  @Post('units/:unitId/move')
  async moveUnit(@Req() req: AuthenticatedRequest, @Param('unitId') unitId: string, @Body() dto: MoveUnitDto) {
    const player = await this.playersService.findByUserId(req.user.id);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return this.unitMovementService.orderMove(player.id, unitId, dto);
  }
}
