import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';

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
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('statistics')
  getStatistics() {
    return this.adminService.getStatistics();
  }
}
