import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListUnitsByOwnerQueryDto } from './dto/list-units-by-owner-query.dto';
import { UnitInstanceService } from './unit-instance.service';

@Controller('units')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UnitInstancesController {
  constructor(private readonly unitInstanceService: UnitInstanceService) {}

  @Get()
  listByOwner(@Query() query: ListUnitsByOwnerQueryDto) {
    return this.unitInstanceService.listByOwnerForAdmin(query.ownerId);
  }
}
