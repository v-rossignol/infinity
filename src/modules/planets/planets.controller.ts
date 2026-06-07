import { Controller, Get, Param } from '@nestjs/common';
import { PlanetsService } from './planets.service';

@Controller('planets')
export class PlanetsController {
  constructor(private readonly planetsService: PlanetsService) {}

  @Get(':planetId')
  async getPlanet(@Param('planetId') planetId: string) {
    return this.planetsService.getPlanet(planetId);
  }
}
