import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { Cube } from '../galaxy/entities/cube.schema';
import { StarSystem } from '../galaxy/entities/star-system.schema';
import { Planet } from '../planets/entities/planet.schema';
import { User } from '../auth/entities/user.entity';
import {
  DEFAULT_LIST_USERS_COUNT,
  DEFAULT_LIST_USERS_PAGE,
  ListUsersQueryDto,
} from './dto/list-users-query.dto';

export type AdminUserSummary = Pick<User, 'id' | 'username' | 'email' | 'role' | 'createdAt'>;

export interface PaginatedAdminUsers {
  items: AdminUserSummary[];
  total: number;
  page: number;
  count: number;
}

export interface AdminStatistics {
  users: number;
  cubes: number;
  starSystems: number;
  planets: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectModel(Cube.name)
    private cubeModel: Model<Cube>,
    @InjectModel(StarSystem.name)
    private starSystemModel: Model<StarSystem>,
    @InjectModel(Planet.name)
    private planetModel: Model<Planet>,
  ) {}

  async getUserById(userId: string): Promise<AdminUserSummary> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async listUsers(query: ListUsersQueryDto = {}): Promise<PaginatedAdminUsers> {
    const page = query.page ?? DEFAULT_LIST_USERS_PAGE;
    const count = query.count ?? DEFAULT_LIST_USERS_COUNT;

    const [items, total] = await this.usersRepository.findAndCount({
      select: ['id', 'username', 'email', 'role', 'createdAt'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * count,
      take: count,
    });

    return { items, total, page, count };
  }

  async getStatistics(): Promise<AdminStatistics> {
    const [users, cubes, starSystems, planets] = await Promise.all([
      this.usersRepository.count(),
      this.cubeModel.countDocuments(),
      this.starSystemModel.countDocuments(),
      this.planetModel.countDocuments(),
    ]);

    return { users, cubes, starSystems, planets };
  }
}
