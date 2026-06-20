import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';
import { GeneratePlanetQueryDto } from './dto/generate-planet-query.dto';
import { ListPlanetsQueryDto } from './dto/list-planets-query.dto';
import { ListSystemsQueryDto } from './dto/list-systems-query.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.adminService.getUserById(req.user.id);
  }

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('planets/generate')
  generatePlanet(@Query() query: GeneratePlanetQueryDto) {
    return this.adminService.generatePlanetPreview(query);
  }

  @Get('planets')
  listPlanets(@Query() query: ListPlanetsQueryDto) {
    return this.adminService.listPlanets(query);
  }

  @Get('systems')
  listStarSystems(@Query() query: ListSystemsQueryDto) {
    return this.adminService.listStarSystems(query);
  }

  @Get('statistics')
  getStatistics() {
    return this.adminService.getStatistics();
  }
}
