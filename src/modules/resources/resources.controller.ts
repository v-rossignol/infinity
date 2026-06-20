import { Controller, Get, Param } from '@nestjs/common';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('planet/:planetId/hex/:q/:r')
  async getByPlanetHex(
    @Param('planetId') planetId: string,
    @Param('q') q: string,
    @Param('r') r: string,
  ) {
    return this.resourcesService.findByPlanetHex(
      planetId,
      this.resourcesService.parseHexCoordinate(q, 'q'),
      this.resourcesService.parseHexCoordinate(r, 'r'),
    );
  }

  @Get('planet/:planetId')
  async getByPlanet(@Param('planetId') planetId: string) {
    return this.resourcesService.findByPlanetId(planetId);
  }
}
