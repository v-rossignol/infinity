import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnitInstanceService } from '../units/unit-instance.service';
import { StarSystemService } from './star-system.service';

@Controller('systems')
@UseGuards(JwtAuthGuard)
export class SystemsController {
  constructor(
    private readonly starSystemService: StarSystemService,
    private readonly unitInstanceService: UnitInstanceService,
  ) {}

  @Get(':systemId')
  async getStarSystem(@Param('systemId') systemId: string) {
    return this.starSystemService.getStarSystem(systemId);
  }

  @Get(':systemId/units')
  listSystemUnits(@Param('systemId') systemId: string) {
    return this.unitInstanceService.listByStarSystem(systemId);
  }
}
