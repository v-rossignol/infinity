# Infinity - Serveur - Setup Projet

**Date** : 7 juin 2026  
**Modèle** : Vibe (Mistral Medium 3.5)  
**Auteur** : Roro LeSage  
**Type** : Documentation Technique - Setup Projet

---

## **1. Introduction**

Ce document décrit la **stack technique** et la **structure de base** pour démarrer le projet du **serveur** du jeu **Infinity**. Le serveur est responsable de la **gestion des joueurs**, de la **synchronisation en temps réel**, de la **génération procédurale des systèmes stellaires et planètes**, et de la **persistance des données**.

---

## **2. Stack Technologique**

### **A. Core Technologies**


| **Catégorie**                | **Technologie**                                                    | **Version Recommandée** | **Rôle**                                                                                     |
| ---------------------------- | ------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------- |
| **Langage**                  | Node.js (TypeScript)                                               | v20.x                   | Environnement d'exécution JavaScript côté serveur.                                           |
| **Framework**                | [NestJS](https://nestjs.com/)                                      | v10.x                   | Framework modulaire pour construire des APIs et des services scalables.                      |
| **Communication Temps Réel** | [Socket.IO](https://socket.io/)                                    | v4.x                    | Gestion des connexions WebSocket pour le multijoueur en temps réel.                          |
| **Base de Données (SQL)**    | [PostgreSQL](https://www.postgresql.org/)                          | v16.x                   | Stockage des données structurées (comptes joueurs, inventaires, etc.).                       |
| **Base de Données (NoSQL)**  | [MongoDB](https://www.mongodb.com/)                                | v7.x                    | Stockage des données non structurées (systèmes stellaires, planètes générées dynamiquement). |
| **Cache**                    | [Redis](https://redis.io/)                                         | v7.x                    | Cache des sessions joueurs et des données temporaires (positions, etc.).                     |
| **ORM (PostgreSQL)**         | [TypeORM](https://typeorm.io/)                                     | v0.3.x                  | ORM pour interagir avec PostgreSQL.                                                          |
| **ORM (MongoDB)**            | [Mongoose](https://mongoosejs.com/)                                | v8.x                    | ODM pour interagir avec MongoDB.                                                             |
| **Validation**               | [class-validator](https://github.com/typestack/class-validator)    | v0.14.x                 | Validation des données entrantes (DTOs).                                                     |
| **Sécurité**                 | [Passport.js](http://www.passportjs.org/) + [JWT](https://jwt.io/) | -                       | Authentification et autorisation des joueurs.                                                |
| **Tests**                    | [Jest](https://jestjs.io/)                                         | v29.x                   | Framework de tests unitaires et d'intégration.                                               |
| **Linter/Formatter**         | ESLint + Prettier                                                  | -                       | Outils pour la qualité du code.                                                              |
| **Conteneurisation**         | [Docker](https://www.docker.com/)                                  | -                       | Conteneurisation de l'application pour un déploiement facile.                                |
| **Orchestration**            | [Docker Compose](https://docs.docker.com/compose/)                 | -                       | Gestion des services (PostgreSQL, MongoDB, Redis) en local.                                  |


---

## **3. Structure du Projet**

```
infinity-server/
├── src/
│   ├── main.ts                 # Point d'entrée de l'application NestJS
│   │
│   ├── config/                 # Configuration de l'application
│   │   ├── app.config.ts        # Configuration générale (port, CORS, etc.)
│   │   ├── database.config.ts   # Configuration des bases de données
│   │   └── socket.config.ts     # Configuration de Socket.IO
│   │
│   ├── modules/                # Modules NestJS
│   │   ├── auth/                # Module d'authentification
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/             # Data Transfer Objects
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   ├── entities/        # Entités TypeORM
│   │   │   │   └── user.entity.ts
│   │   │   └── strategies/      # Stratégies Passport (JWT, etc.)
│   │   │
│   │   ├── players/             # Module de gestion des joueurs
│   │   │   ├── players.controller.ts
│   │   │   ├── players.module.ts
│   │   │   ├── players.service.ts
│   │   │   ├── dto/             # DTOs
│   │   │   │   └── update-position.dto.ts
│   │   │   └── entities/        # Entités
│   │   │       └── player.entity.ts
│   │   │
│   │   ├── galaxy/              # Module de gestion de la galaxie
│   │   │   ├── galaxy.controller.ts
│   │   │   ├── galaxy.module.ts
│   │   │   ├── galaxy.service.ts
│   │   │   ├── dto/             # DTOs
│   │   │   │   └── system-data.dto.ts
│   │   │   └── entities/        # Entités MongoDB (systèmes stellaires)
│   │   │       └── star-system.schema.ts
│   │   │
│   │   ├── planets/             # Module de gestion des planètes
│   │   │   ├── planets.controller.ts
│   │   │   ├── planets.module.ts
│   │   │   ├── planets.service.ts
│   │   │   ├── dto/             # DTOs
│   │   │   │   └── planet-data.dto.ts
│   │   │   └── entities/        # Entités MongoDB (planètes)
│   │   │       └── planet.schema.ts
│   │   │
│   │   ├── resources/           # Module de gestion des ressources
│   │   │   ├── resources.controller.ts
│   │   │   ├── resources.module.ts
│   │   │   ├── resources.service.ts
│   │   │   └── entities/        # Entités
│   │   │       └── resource.schema.ts
│   │   │
│   │   ├── socket/              # Module de gestion des WebSockets
│   │   │   ├── socket.gateway.ts # Gateway Socket.IO (NestJS)
│   │   │   ├── socket.module.ts
│   │   │   └── events/          # Gestion des événements Socket.IO
│   │   │       ├── galaxy.events.ts
│   │   │       ├── system.events.ts
│   │   │       └── planet.events.ts
│   │   │
│   │   └── shared/              # Code partagé
│   │       ├── utils/           # Utilitaires
│   │       │   ├── math.ts      # Fonctions mathématiques
│   │       │   └── procedural-generation.ts # Algorithmes de génération procédurale
│   │       ├── interfaces/      # Interfaces TypeScript
│   │       │   ├── player.interface.ts
│   │       │   ├── star-system.interface.ts
│   │       │   └── planet.interface.ts
│   │       └── constants/       # Constantes globales
│   │           └── game.constants.ts
│   │
│   ├── app.module.ts            # Module racine de NestJS
│   └── app.service.ts           # Service racine
│
├── test/                       # Tests
│   ├── e2e/                    # Tests end-to-end
│   └── unit/                   # Tests unitaires
│
├── docker/                     # Configuration Docker
│   ├── Dockerfile              # Image du serveur NestJS
│   └── docker-compose.yml      # Services locaux (PostgreSQL, MongoDB, Redis)
├── scripts/                    # Scripts opérationnels (déploiement, maintenance, etc.)
├── .env                        # Variables d'environnement
├── .gitignore
├── package.json
├── tsconfig.json               # Configuration TypeScript
└── README.md
```

---

## **4. Dépendances du Projet**

### **A. `package.json**`

```json
{
  "name": "infinity-server",
  "version": "1.0.0",
  "description": "Serveur pour le jeu Infinity",
  "author": "Roro LeSage",
  "private": true,
  "license": "MIT",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/platform-socket.io": "^10.3.0",
    "@nestjs/websockets": "^10.3.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/mongoose": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "mongoose": "^8.0.3",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "bcrypt": "^5.1.1",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1",
    "socket.io": "^4.7.2",
    "pg": "^8.11.3",
    "typeorm": "^0.3.19",
    "redis": "^4.6.10",
    "ioredis": "^5.3.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.10.6",
    "@types/passport-jwt": "^4.0.0",
    "@types/passport-local": "^1.0.38",
    "@types/bcrypt": "^5.0.2",
    "@typescript-eslint/eslint-plugin": "^6.18.0",
    "@typescript-eslint/parser": "^6.18.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.2",
    "jest": "^29.7.0",
    "prettier": "^3.1.1",
    "source-map-support": "^0.5.21",
    "ts-jest": "^29.1.1",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.3.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

---

## **5. Configuration de Base**

### **A. `src/main.ts**`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SocketAdapter } from './modules/socket/socket.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activation du CORS (à adapter en production)
  app.enableCors({
    origin: '*', // Remplacer par les origines autorisées en production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation globale des DTOs
  app.useGlobalPipes(new ValidationPipe());

  // Configuration de Socket.IO
  app.useWebSocketAdapter(new SocketAdapter(app));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
```

---

### **B. `src/app.module.ts**`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { GalaxyModule } from './modules/galaxy/galaxy.module';
import { PlanetsModule } from './modules/planets/planets.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { SocketModule } from './modules/socket/socket.module';
import { databaseConfig } from './config/database.config';

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
})
export class AppModule {}
```

---

### **C. `src/config/database.config.ts**`

```typescript
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
    synchronize: process.env.NODE_ENV === 'development', // Désactiver en production
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
```

---

### **D. `src/config/socket.config.ts**`

```typescript
import { ServerOptions } from 'socket.io';

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: '*', // Remplacer par les origines autorisées en production
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
};
```

---

## **6. Modules de Base**

### **A. Module Socket.IO**

#### `**src/modules/socket/socket.adapter.ts**`

```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { socketConfig } from '../../config/socket.config';

export class SocketAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, { ...socketConfig, ...options });
    return server;
  }
}
```

#### `**src/modules/socket/socket.gateway.ts**`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GalaxyService } from '../galaxy/galaxy.service';
import { PlanetsService } from '../planets/planets.service';

@WebSocketGateway({ namespace: '/' })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly galaxyService: GalaxyService,
    private readonly planetsService: PlanetsService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Logique de connexion (ex: authentification)
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Logique de déconnexion (ex: supprimer le joueur de la liste active)
  }

  // Exemple d'événement pour la galaxie
  @SubscribeMessage('GALAXY_MOVE')
  handleGalaxyMove(client: Socket, payload: { x: number; y: number; z: number }) {
    // Valider et traiter le mouvement
    this.galaxyService.handlePlayerMove(client.id, payload);
    // Diffuser aux autres clients
    this.server.emit('GALAXY_UPDATE', { playerId: client.id, ...payload });
  }

  // Exemple d'événement pour les planètes
  @SubscribeMessage('PLANET_MOVE')
  handlePlanetMove(client: Socket, payload: { planetId: string; x: number; y: number }) {
    this.planetsService.handlePlayerMove(client.id, payload);
    this.server.to(payload.planetId).emit('PLANET_UPDATE', { playerId: client.id, ...payload });
  }
}
```

---

### **B. Module Authentification**

#### `**src/modules/auth/auth.module.ts**`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

#### `**src/modules/auth/entities/user.entity.ts**`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string; // À hacher avec bcrypt

  @Column({ default: '' })
  email?: string;

  @Column({ default: new Date() })
  createdAt: Date;

  @Column({ default: new Date() })
  updatedAt: Date;
}
```

#### `**src/modules/auth/auth.service.ts**`

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOneBy({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(username: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ username, password: hashedPassword });
    return this.usersRepository.save(user);
  }
}
```

---

### **C. Module Galaxy**

#### `**src/modules/galaxy/galaxy.service.ts**`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StarSystem } from './entities/star-system.schema';
import { generateStarSystem } from '../../shared/utils/procedural-generation';

@Injectable()
export class GalaxyService {
  constructor(
    @InjectModel(StarSystem.name)
    private starSystemModel: Model<StarSystem>,
  ) {}

  async getStarSystem(systemId: string) {
    let system = await this.starSystemModel.findById(systemId).exec();
    if (!system) {
      // Générer un nouveau système stellaire si inexistant
      system = await this.generateStarSystem(systemId);
    }
    return system;
  }

  async generateStarSystem(systemId: string) {
    const systemData = generateStarSystem({ seed: systemId });
    const system = new this.starSystemModel({
      _id: systemId,
      ...systemData,
      visited: true,
      createdAt: new Date(),
    });
    return system.save();
  }

  async handlePlayerMove(playerId: string, position: { x: number; y: number; z: number }) {
    // Logique pour gérer le mouvement du joueur dans la galaxie
    // Exemple: mettre à jour la position dans Redis
    console.log(`Player ${playerId} moved to (${position.x}, ${position.y}, ${position.z})`);
  }
}
```

#### `**src/modules/galaxy/entities/star-system.schema.ts**`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class StarSystem extends Document {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Object], required: true })
  stars: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    mass: number;
    temperature: number;
  }>;

  @Prop({ type: [Object], required: true })
  planets: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    type: string;
    resources: Record<string, number>;
  }>;

  @Prop({ default: false })
  visited: boolean;
}

export const StarSystemSchema = SchemaFactory.createForClass(StarSystem);
```

---

### **D. Module Planets**

#### `**src/modules/planets/planets.service.ts**`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Planet } from './entities/planet.schema';
import { generatePlanet } from '../../shared/utils/procedural-generation';

@Injectable()
export class PlanetsService {
  constructor(
    @InjectModel(Planet.name)
    private planetModel: Model<Planet>,
  ) {}

  async getPlanet(planetId: string) {
    let planet = await this.planetModel.findById(planetId).exec();
    if (!planet) {
      // Générer une nouvelle planète si inexistante
      planet = await this.generatePlanet(planetId);
    }
    return planet;
  }

  async generatePlanet(planetId: string) {
    const planetData = generatePlanet({ seed: planetId });
    const planet = new this.planetModel({
      _id: planetId,
      ...planetData,
      visited: true,
      createdAt: new Date(),
    });
    return planet.save();
  }

  async handlePlayerMove(playerId: string, payload: { planetId: string; x: number; y: number }) {
    // Logique pour gérer le mouvement du joueur sur la planète
    console.log(`Player ${playerId} moved to (${payload.x}, ${payload.y}) on planet ${payload.planetId}`);
  }
}
```

#### `**src/modules/planets/entities/planet.schema.ts**`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Planet extends Document {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  starSystemId: string;

  @Prop({ required: true })
  seed: string;

  @Prop({ type: [String], required: true })
  biomeTypes: string[];

  @Prop({ type: Object, required: true })
  resources: Record<string, number>;

  @Prop({ type: [[Number]], required: true })
  heightMap: number[][];

  @Prop({ type: [[String]], required: true })
  tileMap: string[][];

  @Prop({ default: false })
  visited: boolean;
}

export const PlanetSchema = SchemaFactory.createForClass(Planet);
```

---

## **7. Utilitaires Partagés**

### **A. Génération Procédurale**

#### `**src/shared/utils/procedural-generation.ts**`

```typescript
import { Perlin } from 'noisejs';

// Génération d'un système stellaire
interface StarSystemData {
  name: string;
  stars: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    mass: number;
    temperature: number;
  }>;
  planets: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    type: string;
    resources: Record<string, number>;
  }>;
}

interface GenerateStarSystemOptions {
  seed: string;
}

export const generateStarSystem = (options: GenerateStarSystemOptions): StarSystemData => {
  const { seed } = options;
  const noise = new Perlin(seed);

  // Génération des étoiles (1 à 3 par système)
  const starCount = Math.floor(noise.perlin2(0, 0) * 2) + 1;
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2;
    const distance = 50 + noise.perlin2(i, 0) * 20;
    stars.push({
      id: `${seed}_star_${i}`,
      type: ['yellow', 'red', 'blue', 'white'][Math.floor(Math.random() * 4)],
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      mass: 0.5 + Math.random() * 2,
      temperature: 3000 + Math.random() * 7000,
    });
  }

  // Génération des planètes (3 à 8 par système)
  const planetCount = Math.floor(noise.perlin2(1, 0) * 5) + 3;
  const planets = [];
  for (let i = 0; i < planetCount; i++) {
    const starIndex = Math.floor(Math.random() * stars.length);
    const star = stars[starIndex];
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + noise.perlin2(i, 1) * 50;
    planets.push({
      id: `${seed}_planet_${i}`,
      name: `Planet ${i + 1}`,
      x: star.x + Math.cos(angle) * distance,
      y: star.y + Math.sin(angle) * distance,
      radius: 5 + Math.random() * 10,
      type: ['rocky', 'gas', 'ice', 'lava'][Math.floor(Math.random() * 4)],
      resources: {
        iron: Math.floor(Math.random() * 1000),
        gold: Math.floor(Math.random() * 500),
        water: Math.floor(Math.random() * 2000),
      },
    });
  }

  return {
    name: `Star System ${seed.substring(0, 8)}`,
    stars,
    planets,
  };
};

// Génération d'une planète
interface PlanetData {
  name: string;
  biomeTypes: string[];
  resources: Record<string, number>;
  heightMap: number[][];
  tileMap: string[][];
}

interface GeneratePlanetOptions {
  seed: string;
  width?: number;
  height?: number;
}

export const generatePlanet = (options: GeneratePlanetOptions): PlanetData =>
```