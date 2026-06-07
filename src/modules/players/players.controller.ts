import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PlayersService } from './players.service';
import { UpdatePositionDto } from './dto/update-position.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    let player = await this.playersService.findByUserId(userId);
    if (!player) {
      player = await this.playersService.createForUser(userId);
    }
    return player;
  }

  @Patch(':playerId/position')
  async updatePosition(
    @Param('playerId') playerId: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.playersService.updatePosition(playerId, updatePositionDto);
  }
}
