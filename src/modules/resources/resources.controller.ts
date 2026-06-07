import { Controller, Get, Param } from '@nestjs/common';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('planet/:planetId')
  async getByPlanet(@Param('planetId') planetId: string) {
    return this.resourcesService.findByPlanetId(planetId);
  }
}
