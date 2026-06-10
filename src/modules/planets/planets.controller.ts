import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlanetsService } from './planets.service';
import { GetPlanetQueryDto } from './dto/get-planet-query.dto';

@Controller('planets')
export class PlanetsController {
  constructor(private readonly planetsService: PlanetsService) {}

  @Get(':planetId')
  async getPlanet(@Param('planetId') planetId: string, @Query() query: GetPlanetQueryDto) {
    return this.planetsService.getPlanet(planetId, query.systemId);
  }
}
