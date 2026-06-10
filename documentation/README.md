# Infinity Server

Serveur NestJS pour le jeu **Infinity** — gestion des joueurs, synchronisation temps réel (Socket.IO), génération procédurale et persistance des données.

## Stack

- **Node.js 20** + **TypeScript**
- **NestJS 10** — API REST et modules
- **Socket.IO 4** — WebSockets multijoueur
- **PostgreSQL 16** + **TypeORM** — données structurées (joueurs, comptes)
- **MongoDB 7** + **Mongoose** — systèmes stellaires et planètes
- **Redis 7** — cache cubes (galaxy) ; sessions/positions prévus

## Démarrage rapide

### 1. Services de base de données (Docker)

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 2. Installation et lancement

```bash
npm install
cp .env.example .env   # si .env n'existe pas
npm run start:dev
```

Le serveur écoute sur [http://localhost:4000](http://localhost:4000).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run start:dev` | Développement avec rechargement |
| `npm run build` | Compilation TypeScript |
| `npm run start:prod` | Production (`dist/main`) |
| `npm run test` | Tests unitaires |
| `npm run test:e2e` | Tests end-to-end (galaxy ignorés sans `RUN_E2E=1`) |
| `npm run test:e2e:docker` | E2E galaxy avec `RUN_E2E=1` (Docker requis) |
| `npm run lint` | ESLint |

## Documentation

| Document | Contenu |
|----------|---------|
| [infinity-api.md](./infinity-api.md) | API REST et WebSocket (préfixe `/infinity`) |
| [galaxy/README.md](./galaxy/README.md) | Galaxie par cubes — index et specs |
| [stellar-system/README.md](./stellar-system/README.md) | Stellar system — enter star, shared UUID, legacy vs intended |
| [server-setup.md](./server-setup.md) | Architecture des modules |

## Structure

Voir `documentation/server-setup.md` pour l'architecture détaillée des modules (`auth`, `players`, `galaxy`, `planets`, `resources`, `socket`).

- `docker/` — configuration Docker (image serveur, bases de données locales)
- `scripts/` — scripts opérationnels (déploiement, maintenance)
