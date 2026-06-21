import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StarSystemService } from './star-system.service';

@Controller('systems')
@UseGuards(JwtAuthGuard)
export class SystemsController {
  constructor(private readonly starSystemService: StarSystemService) {}

  @Get(':systemId')
  async getStarSystem(@Param('systemId') systemId: string) {
    return this.starSystemService.getStarSystem(systemId);
  }
}
