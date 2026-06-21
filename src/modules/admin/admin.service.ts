import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { Cube } from '../galaxy/entities/cube.schema';
import { StarSystem } from '../galaxy/entities/star-system.schema';
import { Planet } from '../planets/entities/planet.schema';
import { PlanetPreviewCacheService } from '../planets/planet-preview-cache.service';
import { UnitType } from '../units/entities/unit-type.entity';
import { UnitCatalogService } from '../units/unit-catalog.service';
import { User } from '../auth/entities/user.entity';
import { AdminGeneratedPlanetPreview } from '../../shared/interfaces/planet-preview.interface';
import { generatePlanetSurface } from '../../shared/utils/planet-surface-generation';
import {
  DEFAULT_GENERATE_PLANET_RADIUS,
  DEFAULT_GENERATE_PLANET_TYPE,
  GeneratePlanetQueryDto,
} from './dto/generate-planet-query.dto';
import {
  DEFAULT_LIST_PLANETS_COUNT,
  DEFAULT_LIST_PLANETS_PAGE,
  ListPlanetsQueryDto,
} from './dto/list-planets-query.dto';
import {
  DEFAULT_LIST_SYSTEMS_COUNT,
  DEFAULT_LIST_SYSTEMS_PAGE,
  ListSystemsQueryDto,
} from './dto/list-systems-query.dto';
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

export type AdminPlanetSummary = Pick<
  Planet,
  '_id' | 'name' | 'starSystemId' | 'type' | 'radius' | 'resources'
> & {
  createdAt: Date;
  updatedAt: Date;
};

export interface PaginatedAdminPlanets {
  items: AdminPlanetSummary[];
  total: number;
  page: number;
  count: number;
}

export type AdminStarSystemSummary = Pick<StarSystem, '_id' | 'name' | 'planets' | 'visited'> & {
  createdAt: Date;
  updatedAt: Date;
};

export interface PaginatedAdminStarSystems {
  items: AdminStarSystemSummary[];
  total: number;
  page: number;
  count: number;
}

export interface AdminStatistics {
  users: number;
  cubes: number;
  starSystems: number;
  planets: number;
  vehicules: number;
  buildings: number;
}

export type AdminUnitTypeSummary = Pick<
  UnitType,
  | 'id'
  | 'name'
  | 'type'
  | 'size'
  | 'mobility'
  | 'speed'
  | 'environments'
  | 'rules'
  | 'capabilities'
  | 'description'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export interface AdminUnitTypeList {
  items: AdminUnitTypeSummary[];
  total: number;
}

export type { AdminGeneratedPlanetPreview } from '../../shared/interfaces/planet-preview.interface';

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
    private readonly planetPreviewCacheService: PlanetPreviewCacheService,
    private readonly unitCatalogService: UnitCatalogService,
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

  async generatePlanetPreview(
    query: GeneratePlanetQueryDto = {},
  ): Promise<AdminGeneratedPlanetPreview> {
    const radius = query.radius ?? DEFAULT_GENERATE_PLANET_RADIUS;
    const type = query.type ?? DEFAULT_GENERATE_PLANET_TYPE;
    const seed = query.seed ?? randomUUID();
    const cached = await this.planetPreviewCacheService.getByParams(seed, radius, type);
    if (cached) {
      return cached;
    }

    const preview: AdminGeneratedPlanetPreview = {
      _id: seed,
      name: 'Preview Planet',
      type,
      radius,
      surface: generatePlanetSurface({ seed, radius, type }),
    };

    await this.planetPreviewCacheService.save(preview);

    return preview;
  }

  async listPlanets(query: ListPlanetsQueryDto = {}): Promise<PaginatedAdminPlanets> {
    const page = query.page ?? DEFAULT_LIST_PLANETS_PAGE;
    const count = query.count ?? DEFAULT_LIST_PLANETS_COUNT;
    const skip = (page - 1) * count;

    const [items, total] = await Promise.all([
      this.planetModel
        .find()
        .select('_id name starSystemId type radius resources createdAt updatedAt')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(count)
        .lean<AdminPlanetSummary[]>(),
      this.planetModel.countDocuments(),
    ]);

    return { items, total, page, count };
  }

  async listStarSystems(query: ListSystemsQueryDto = {}): Promise<PaginatedAdminStarSystems> {
    const page = query.page ?? DEFAULT_LIST_SYSTEMS_PAGE;
    const count = query.count ?? DEFAULT_LIST_SYSTEMS_COUNT;
    const skip = (page - 1) * count;

    const [items, total] = await Promise.all([
      this.starSystemModel
        .find()
        .select('_id name planets visited createdAt updatedAt')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(count)
        .lean<AdminStarSystemSummary[]>(),
      this.starSystemModel.countDocuments(),
    ]);

    return { items, total, page, count };
  }

  async getStatistics(): Promise<AdminStatistics> {
    const [users, cubes, starSystems, planets] = await Promise.all([
      this.usersRepository.count(),
      this.cubeModel.countDocuments(),
      this.starSystemModel.countDocuments(),
      this.planetModel.countDocuments(),
    ]);
    const { vehicules, buildings } = this.unitCatalogService.getCatalogCounts();

    return { users, cubes, starSystems, planets, vehicules, buildings };
  }

  async listVehicules(): Promise<AdminUnitTypeList> {
    const items = await this.unitCatalogService.listVehicules();
    return { items, total: items.length };
  }

  async getVehiculeById(vehiculeId: string): Promise<AdminUnitTypeSummary> {
    const vehicule = await this.unitCatalogService.getVehiculeById(vehiculeId);
    if (!vehicule) {
      throw new NotFoundException('Vehicule not found');
    }

    return vehicule;
  }
}
