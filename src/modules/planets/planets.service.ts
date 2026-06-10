import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Planet } from './entities/planet.schema';
import { generatePlanet } from '../../shared/utils/procedural-generation';

@Injectable()
export class PlanetsService {
  constructor(
    @InjectModel(Planet.name)
    private planetModel: Model<Planet>,
  ) {}

  async getPlanet(planetId: string, starSystemId?: string) {
    let planet = await this.planetModel.findById(planetId).exec();
    if (!planet) {
      planet = await this.generatePlanet(planetId, starSystemId ?? 'unknown');
    }
    return planet;
  }

  async generatePlanet(planetId: string, starSystemId = 'unknown') {
    const planetData = generatePlanet({ seed: planetId });
    const planet = new this.planetModel({
      _id: planetId,
      starSystemId,
      seed: planetId,
      ...planetData,
      visited: true,
    });
    return planet.save();
  }

  async handlePlayerMove(playerId: string, payload: { planetId: string; x: number; y: number }) {
    console.log(
      `Player ${playerId} moved to (${payload.x}, ${payload.y}) on planet ${payload.planetId}`,
    );
  }
}
