import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StarSystemService } from './star-system.service';

@Controller('galaxy')
@UseGuards(JwtAuthGuard)
export class GalaxyController {
  constructor(private readonly starSystemService: StarSystemService) {}

  @Get('systems/:systemId')
  async getStarSystem(@Param('systemId') systemId: string) {
    return this.starSystemService.getStarSystem(systemId);
  }
}
