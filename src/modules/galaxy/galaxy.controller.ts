import { Controller, Get, Param } from '@nestjs/common';
import { GalaxyService } from './galaxy.service';

@Controller('galaxy')
export class GalaxyController {
  constructor(private readonly galaxyService: GalaxyService) {}

  @Get('systems/:systemId')
  async getStarSystem(@Param('systemId') systemId: string) {
    return this.galaxyService.getStarSystem(systemId);
  }
}
