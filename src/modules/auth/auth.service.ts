import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthUser, toAuthUser } from './dto/auth-user.dto';
import { DEFAULT_USER_ROLE, UserRole } from './constants/user-role';
import { User } from './entities/user.entity';

interface CreateUserOptions {
  username: string;
  password: string;
  email?: string;
  role?: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultAdmin();
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOneBy({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  signSession(user: User): AuthSession {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      user: toAuthUser(user),
      token: this.jwtService.sign(payload),
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async register(username: string, password: string, email?: string): Promise<User> {
    const existingUser = await this.usersRepository.findOneBy({ username });
    if (existingUser) {
      throw new ConflictException('Username already taken');
    }
    return this.createUser({ username, password, email });
  }

  async ensureDefaultAdmin(): Promise<void> {
    const username = this.configService.get<string>('DEFAULT_ADMIN_USERNAME', 'admin');
    const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');

    if (!password) {
      this.logger.warn('DEFAULT_ADMIN_PASSWORD is not set; skipping default admin bootstrap');
      return;
    }

    const existingUser = await this.usersRepository.findOneBy({ username });
    if (existingUser) {
      return;
    }

    const email = this.configService.get<string>('DEFAULT_ADMIN_EMAIL', '');
    await this.createUser({ username, password, email, role: 'admin' });
    this.logger.log(`Default admin user "${username}" created`);
  }

  private async createUser(options: CreateUserOptions): Promise<User> {
    const { username, password, email, role = DEFAULT_USER_ROLE } = options;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
      email: email || '',
      role,
    });
    return this.usersRepository.save(user);
  }
}
