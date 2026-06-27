import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerOptions } from 'typeorm';
import { TypeOrmAppLogger } from '../shared/logger';

export const getPostgresConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const queryLoggingEnabled =
    configService.get<string>('POSTGRES_QUERY_LOGGING', 'false') === 'true';
  const logging: LoggerOptions = queryLoggingEnabled ? ['query', 'error'] : false;

  return {
    type: 'postgres',
    host: configService.get<string>('POSTGRES_HOST', 'localhost'),
    port: parseInt(configService.get<string>('POSTGRES_PORT', '5432'), 10),
    username: configService.get<string>('POSTGRES_USER', 'postgres'),
    password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
    database: configService.get<string>('POSTGRES_DB', 'infinity'),
    entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging,
    logger: logging ? new TypeOrmAppLogger(logging) : undefined,
  };
};

export const getMongoUri = (configService: ConfigService): string =>
  configService.get<string>('MONGO_URI', 'mongodb://localhost:27017/infinity');

export const getRedisConfig = (configService: ConfigService) => ({
  host: configService.get<string>('REDIS_HOST', 'localhost'),
  port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
});
