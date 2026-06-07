import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { GalaxyModule } from './modules/galaxy/galaxy.module';
import { PlanetsModule } from './modules/planets/planets.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { SocketModule } from './modules/socket/socket.module';
import { getMongoUri, getPostgresConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggerMiddleware } from './shared/logger';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getPostgresConfig(configService),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: getMongoUri(configService),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PlayersModule,
    GalaxyModule,
    PlanetsModule,
    ResourcesModule,
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
