import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StarsByCubeQueryDto } from './dto/stars-by-cube-query.dto';
import { StarService } from './star.service';

@Controller('stars')
@UseGuards(JwtAuthGuard)
export class StarsController {
  constructor(private readonly starService: StarService) {}

  @Get()
  async findByCubeId(@Query() query: StarsByCubeQueryDto) {
    const stars = await this.starService.findByCubeId(query.cube_id);
    return { stars };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const star = await this.starService.findById(decodeURIComponent(id));
    if (!star) {
      throw new NotFoundException(`Star "${decodeURIComponent(id)}" not found`);
    }
    return star;
  }
}
