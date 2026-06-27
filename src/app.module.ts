import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from './modules/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { GalaxyModule } from './modules/galaxy/galaxy.module';
import { SystemsModule } from './modules/systems/systems.module';
import { PlanetsModule } from './modules/planets/planets.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { SocketModule } from './modules/socket/socket.module';
import { UnitsModule } from './modules/units/units.module';
import { getMongoUri, getPostgresConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggerMiddleware } from './shared/logger';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getPostgresConfig(configService),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: getMongoUri(configService),
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    AuthModule,
    AdminModule,
    PlayersModule,
    GalaxyModule,
    SystemsModule,
    PlanetsModule,
    ResourcesModule,
    UnitsModule,
    SocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
