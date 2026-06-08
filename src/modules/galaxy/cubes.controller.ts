import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CubeService } from './cube.service';
import { parseCubeOrigin } from './pipes/parse-cube-origin.pipe';

@Controller('cubes')
@UseGuards(JwtAuthGuard)
export class CubesController {
  constructor(private readonly cubeService: CubeService) {}

  @Get('by-name/:name')
  async findByName(@Param('name') name: string) {
    const result = await this.cubeService.findByName(name);
    if (!result) {
      throw new NotFoundException(`Cube "${name}" not found`);
    }
    return result;
  }

  @Get(':x/:y/:z/stars')
  async getStars(@Param('x') x: string, @Param('y') y: string, @Param('z') z: string) {
    const { stars } = await this.cubeService.getOrCreateByOrigin(parseCubeOrigin(x, y, z));
    return { stars };
  }

  @Get(':x/:y/:z')
  async getCube(@Param('x') x: string, @Param('y') y: string, @Param('z') z: string) {
    return this.cubeService.getOrCreateByOrigin(parseCubeOrigin(x, y, z));
  }
}
