import { ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let usersRepository: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    usersRepository = {
      findOneBy: jest.fn(),
      create: jest.fn((user: Partial<User>) => user),
      save: jest.fn(async (user: Partial<User>) => ({ id: 'user-id', ...user })),
    };

    configService = {
      get: jest.fn(),
    };

    jwtService = { sign: jest.fn().mockReturnValue('token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  describe('ensureDefaultAdmin', () => {
    it('skips bootstrap when DEFAULT_ADMIN_PASSWORD is missing', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'DEFAULT_ADMIN_USERNAME') {
          return 'admin';
        }
        return defaultValue;
      });

      await service.ensureDefaultAdmin();

      expect(usersRepository.findOneBy).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('creates the default admin when it does not exist', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'DEFAULT_ADMIN_USERNAME') {
          return 'admin';
        }
        if (key === 'DEFAULT_ADMIN_PASSWORD') {
          return 'secret-password';
        }
        if (key === 'DEFAULT_ADMIN_EMAIL') {
          return 'admin@example.com';
        }
        return defaultValue;
      });
      usersRepository.findOneBy.mockResolvedValue(null);

      await service.ensureDefaultAdmin();

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ username: 'admin' });
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
        }),
      );
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('does not recreate the default admin when it already exists', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'DEFAULT_ADMIN_USERNAME') {
          return 'admin';
        }
        if (key === 'DEFAULT_ADMIN_PASSWORD') {
          return 'secret-password';
        }
        return defaultValue;
      });
      usersRepository.findOneBy.mockResolvedValue({
        id: 'existing-id',
        username: 'admin',
        password: 'hashed',
        email: '',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.ensureDefaultAdmin();

      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('creates a regular user account', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);

      await service.register('pilot42', 'secret12', 'pilot@example.com');

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ username: 'pilot42' });
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'pilot42',
          email: 'pilot@example.com',
          role: 'user',
          password: expect.any(String),
        }),
      );
      const createdUser = usersRepository.create.mock.calls[0][0] as User;
      expect(await bcrypt.compare('secret12', createdUser.password)).toBe(true);
    });

    it('throws ConflictException when username is already taken', async () => {
      usersRepository.findOneBy.mockResolvedValue({
        id: 'existing-id',
        username: 'pilot42',
      });

      await expect(service.register('pilot42', 'secret12')).rejects.toThrow(ConflictException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('signSession', () => {
    it('returns user shape and signed token without exposing password or role', () => {
      const user: User = {
        id: 'user-uuid',
        username: 'pilot42',
        password: 'hashed',
        email: 'pilot@example.com',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const session = service.signSession(user);

      expect(session).toEqual({
        user: {
          id: 'user-uuid',
          username: 'pilot42',
          email: 'pilot@example.com',
        },
        token: 'token',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'pilot42',
        sub: 'user-uuid',
        role: 'user',
      });
    });
  });

  describe('findById', () => {
    it('loads a user by id', async () => {
      const user = { id: 'user-uuid', username: 'pilot42' };
      usersRepository.findOneBy.mockResolvedValue(user);

      await expect(service.findById('user-uuid')).resolves.toBe(user);
      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 'user-uuid' });
    });
  });
});
