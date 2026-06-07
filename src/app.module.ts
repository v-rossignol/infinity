import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { GalaxyModule } from './modules/galaxy/galaxy.module';
import { PlanetsModule } from './modules/planets/planets.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { SocketModule } from './modules/socket/socket.module';
import { databaseConfig } from './config/database.config';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig.postgres),
    MongooseModule.forRoot(databaseConfig.mongo.uri),
    AuthModule,
    PlayersModule,
    GalaxyModule,
    PlanetsModule,
    ResourcesModule,
    SocketModule,
  ],
  providers: [AppService],
})
export class AppModule {}
