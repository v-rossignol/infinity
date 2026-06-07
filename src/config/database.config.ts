import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = {
  postgres: {
    type: 'postgres' as const,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'infinity',
    entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
  } as TypeOrmModuleOptions,
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/infinity',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
};
