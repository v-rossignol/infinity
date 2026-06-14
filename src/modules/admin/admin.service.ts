import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { Cube } from '../galaxy/entities/cube.schema';
import { StarSystem } from '../galaxy/entities/star-system.schema';
import { Planet } from '../planets/entities/planet.schema';
import { User } from '../auth/entities/user.entity';

export type AdminUserSummary = Pick<User, 'id' | 'username' | 'email' | 'role' | 'createdAt'>;

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

  async listUsers(): Promise<AdminUserSummary[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'email', 'role', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
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
