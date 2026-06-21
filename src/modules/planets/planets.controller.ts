import { Controller, Get, Param, Query } from '@nestjs/common';
import { UnitInstanceService } from '../units/unit-instance.service';
import { PlanetsService } from './planets.service';
import { GetPlanetQueryDto } from './dto/get-planet-query.dto';

@Controller('planets')
export class PlanetsController {
  constructor(
    private readonly planetsService: PlanetsService,
    private readonly unitInstanceService: UnitInstanceService,
  ) {}

  @Get(':planetId')
  async getPlanet(@Param('planetId') planetId: string, @Query() query: GetPlanetQueryDto) {
    return this.planetsService.getPlanet(planetId, query.systemId);
  }

  @Get(':planetId/units')
  listPlanetUnits(@Param('planetId') planetId: string) {
    return this.unitInstanceService.listByPlanet(planetId);
  }
}
