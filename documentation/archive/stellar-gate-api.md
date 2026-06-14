# StellarGate — API d'authentification

```yaml
date: 2026-06-07
author: Roro LeSage
type: API Contract
sources:
  - documentation/stellar-gate/needed-enpoint.md
  - src/modules/auth/
  - src/config/app.config.ts
```

Contrat HTTP entre le client **StellarGate** (écran register / login) et le serveur **Infinity** (NestJS).  
Ce document reflète les DTOs, l'entité `User` et la configuration actuelles du projet, et définit le comportement cible attendu par le client.

---

## Base URL

| Environnement | Point d'entrée client | API auth |
|---------------|----------------------|----------|
| Développement (reverse proxy) | `http://localhost:<port>` | `/infinity/auth/*` (chemins relatifs) |
| Développement (accès direct NestJS) | `http://localhost:4000` | `/infinity/auth/*` |
| Production | `https://<domaine>` | `/infinity/auth/*` |

Port NestJS configurable via `PORT` (défaut `4000`, voir `.env.example`). En développement, le client **ne cible pas** ce port directement : il passe par le reverse proxy (même host/port que l'UI).

**Préfixe global** : `/infinity` — toutes les routes HTTP du serveur sont exposées sous `/infinity/*` (ex. `/infinity/auth/register`).

> **État actuel (2026-06-13)** : aligné sur le contrat cible — cookie `infinity_token`, `{ user }` sur login/register, `GET /me`, `POST /logout`, stub forgot-password, `409` sur doublon username. Voir [auth-alignment-development-plan.md](./auth-alignment-development-plan.md).

### Développement — reverse proxy

En développement, un reverse proxy sert le client StellarGate et le serveur Infinity sur **le même host et le même port** :

```
http://localhost:<port>/              → client StellarGate (assets, SPA)
http://localhost:<port>/infinity/*    → serveur NestJS (proxy vers :4000)
```

Le client appelle l'API avec des **chemins relatifs** (recommandé) :

```
POST /infinity/auth/login
GET  /infinity/auth/me
```

Pas de `http://localhost:4000` codé en dur côté client. Les cookies de session sont posés sur l'origine du proxy ; les requêtes API sont **same-origin**, ce qui simplifie l'authentification par cookie.

---

## Modèle d'authentification

Le client StellarGate **ne stocke pas de token en JavaScript**. L'authentification repose sur un cookie `httpOnly` posé par le serveur à chaque `register` ou `login`.

| Aspect | Valeur cible |
|--------|--------------|
| Mécanisme | JWT signé, transporté dans un cookie |
| Cookie `httpOnly` | `true` — inaccessible depuis `document.cookie` |
| Cookie `Secure` | `true` en production (`NODE_ENV=production`) |
| Cookie `SameSite` | `Lax` (développement), `Strict` recommandé en production |
| Cookie `Path` | `/infinity` — cookie envoyé uniquement aux routes API |
| Nom du cookie | `infinity_token` |
| Durée de vie | `1h` (aligné sur `appConfig.jwt.expiresIn`) |
| Requêtes authentifiées | `withCredentials: true` si requête cross-origin ; **inutile** en same-origin (défaut du navigateur) |

### CORS

| Contexte | Comportement |
|----------|--------------|
| **Développement (reverse proxy)** | Client et API partagent la même origine (`host:port`). **Pas de CORS** à gérer pour les appels `/infinity/*`. |
| **Développement (accès direct `:4000`)** | Requêtes cross-origin si le client tourne sur un autre port. `CORS_ORIGIN` doit pointer vers l'origine exacte du client, **pas** `*`. |
| **Production** | Selon le déploiement : same-origin via proxy (comme en dev) ou origines distinctes avec `CORS_ORIGIN` explicite. |

Variables concernées (accès cross-origin uniquement) :

```
CORS_ORIGIN=http://localhost:5173
```

Configuration actuelle dans `app.config.ts` : `credentials: true`. `main.ts` utilise encore `origin: '*'` en dur — à remplacer par `appConfig.cors` si le client n'est pas servi via le même reverse proxy.

### Extraction du JWT côté serveur

La stratégie Passport actuelle (`jwt.strategy.ts`) lit le token depuis le header `Authorization: Bearer`. Pour le modèle cookie, elle devra aussi accepter le cookie `infinity_token` (via `cookie-parser` ou extracteur custom).

---

## Format des erreurs

NestJS renvoie un JSON structuré pour toutes les erreurs HTTP.

### Validation (`400`)

Émise par le `ValidationPipe` global lorsque le body ne respecte pas les DTOs.

```json
{
  "statusCode": 400,
  "message": [
    "password must be longer than or equal to 6 characters",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

Quand une seule règle échoue, `message` peut être une chaîne plutôt qu'un tableau.

### Non autorisé (`401`)

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### Conflit (`409`)

```json
{
  "statusCode": 409,
  "message": "Username already taken",
  "error": "Conflict"
}
```

> **État actuel** : un doublon de `username` provoque une erreur base de données non gérée (probablement `500`). Le code `409` est le comportement cible à implémenter.

---

## Règles de validation

Dérivées des DTOs dans `src/modules/auth/dto/`.

| Champ | Endpoint | Règles |
|-------|----------|--------|
| `username` | register, login | `string`, non vide |
| `password` | register, login | `string`, minimum 6 caractères |
| `email` | register | `string`, format email valide, **optionnel** |
| `email` | forgot-password | `string`, format email valide, obligatoire |

L'entité `User` stocke `email` avec une valeur par défaut `''` si absent à l'inscription.

---

## Endpoints

| Méthode | Route | Auth | Statut implémentation |
|---------|-------|------|----------------------|
| `POST` | `/infinity/auth/register` | Non | Partiel |
| `POST` | `/infinity/auth/login` | Non | Partiel |
| `POST` | `/infinity/auth/logout` | Oui | Implémenté |
| `GET` | `/infinity/auth/me` | Oui | Implémenté |
| `POST` | `/infinity/auth/forgot-password` | Non | Stub (no-op email) |

**Légende** — *Partiel* : la route existe (`/auth/*`, sans préfixe global) mais la réponse et le cookie ne correspondent pas encore au contrat ci-dessous.

---

### `POST /infinity/auth/register`

Crée un compte utilisateur et établit une session.

#### Requête

```
POST /infinity/auth/register
Content-Type: application/json
```

```json
{
  "username": "pilot42",
  "password": "secret12",
  "email": "pilot@example.com"
}
```

`email` est optionnel :

```json
{
  "username": "pilot42",
  "password": "secret12"
}
```

#### Réponse `201 Created`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "pilot42",
    "email": "pilot@example.com"
  }
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `user.id` | `string` (UUID) | Identifiant unique (`User.id`) |
| `user.username` | `string` | Nom d'utilisateur |
| `user.email` | `string` | Adresse email, ou `""` si non fournie |

**Cookie** : `Set-Cookie: infinity_token=<jwt>; HttpOnly; Path=/infinity; SameSite=Lax; Max-Age=3600`

Le mot de passe n'est **jamais** renvoyé dans la réponse.

#### Erreurs

| Code | Cause |
|------|-------|
| `400` | Body invalide (champs manquants, mot de passe trop court, email mal formé) |
| `409` | `username` déjà utilisé |

#### Écart actuel

| Attendu (contrat) | Implémenté aujourd'hui |
|-------------------|------------------------|
| Status `201` | `200` (défaut NestJS) |
| Body `{ user: { id, username, email } }` | `{ access_token: "<jwt>" }` |
| Cookie `httpOnly` | Aucun cookie |

---

### `POST /infinity/auth/login`

Authentifie un utilisateur existant et établit une session.

#### Requête

```
POST /infinity/auth/login
Content-Type: application/json
```

```json
{
  "username": "pilot42",
  "password": "secret12"
}
```

#### Réponse `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "pilot42",
    "email": "pilot@example.com"
  }
}
```

**Cookie** : identique à `register`.

#### Erreurs

| Code | Cause |
|------|-------|
| `400` | Body invalide |
| `401` | Identifiants incorrects (`username` inconnu ou mot de passe erroné) |

#### Écart actuel

| Attendu (contrat) | Implémenté aujourd'hui |
|-------------------|------------------------|
| Body `{ user: { ... } }` + cookie | `{ access_token: "<jwt>" }` |

---

### `POST /infinity/auth/logout`

Invalide la session courante.

#### Requête

```
POST /infinity/auth/logout
Cookie: infinity_token=<jwt>
```

Body vide.

#### Réponse `200 OK`

```json
{
  "success": true
}
```

**Cookie** : `Set-Cookie: infinity_token=; HttpOnly; Path=/infinity; Max-Age=0` (suppression).

#### Erreurs

| Code | Cause |
|------|-------|
| `401` | Cookie absent, JWT expiré ou invalide |

#### Écart actuel

Endpoint non implémenté. Pas de liste de révocation JWT (stateless) : la déconnexion repose sur la suppression du cookie côté client **et** l'expiration naturelle du JWT. Une blacklist Redis pourra être ajoutée ultérieurement si nécessaire.

---

### `GET /infinity/auth/me`

Restaure la session au chargement de l'application StellarGate (vérification « suis-je connecté ? »).

#### Requête

```
GET /infinity/auth/me
Cookie: infinity_token=<jwt>
```

#### Réponse `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "pilot42",
  "email": "pilot@example.com"
}
```

> **Note** : contrairement à `login` / `register`, la réponse est l'objet utilisateur **à plat** (sans wrapper `user`). Ce format est intentionnel pour simplifier la restauration de session côté client.

#### Erreurs

| Code | Cause |
|------|-------|
| `401` | Cookie absent, JWT expiré ou invalide |

#### Écart actuel

Endpoint non implémenté. Nécessite un guard JWT adapté au cookie et une lecture de l'entité `User` en base (le payload JWT ne contient que `sub` et `username`, pas `email`).

---

### `POST /infinity/auth/forgot-password` *(optionnel)*

Demande une réinitialisation de mot de passe. Non requis pour la première version de StellarGate.

#### Requête

```
POST /infinity/auth/forgot-password
Content-Type: application/json
```

```json
{
  "email": "pilot@example.com"
}
```

#### Réponse `200 OK`

```json
{
  "success": true
}
```

Toujours `200`, même si l'email n'existe pas (évite l'énumération de comptes).

#### Erreurs

| Code | Cause |
|------|-------|
| `400` | Email absent ou mal formé |

#### Écart actuel

Endpoint non implémenté. Aucun service d'envoi d'email configuré dans le projet.

---

## Modèle de données — `User`

Entité PostgreSQL (`src/modules/infinity/auth/entities/user.entity.ts`) :

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | UUID | Clé primaire, auto-générée |
| `username` | string | Unique, obligatoire |
| `password` | string | Hash bcrypt (10 rounds), jamais exposé |
| `email` | string | Défaut `""` |
| `createdAt` | datetime | Auto |
| `updatedAt` | datetime | Auto |

---

## Après authentification

Une fois la session établie, StellarGate devra probablement charger le profil joueur. Endpoint existant hors scope auth, mais utile pour l'intégration :

### `GET /infinity/players/:userId`

```
GET /infinity/players/550e8400-e29b-41d4-a716-446655440000
Cookie: infinity_token=<jwt>
```

Crée automatiquement un `Player` si aucun n'existe pour cet `userId`.

**État actuel** : route `/players/:userId` (sans préfixe), pas de guard JWT — à sécuriser avant production.

---

## Variables d'environnement

| Variable | Rôle | Défaut |
|----------|------|--------|
| `PORT` | Port HTTP du serveur | `4000` |
| `JWT_SECRET` | Clé de signature JWT | `change-me-in-production` |
| `CORS_ORIGIN` | Origine autorisée (cross-origin uniquement) | `*` (inutile si reverse proxy same-origin en dev) |
| `POSTGRES_*` | Connexion PostgreSQL (entité `User`) | voir `.env.example` |

---

## Exemples cURL (contrat cible)

### Via reverse proxy (comme le client StellarGate)

Remplacer `<port>` par le port du proxy de développement.

```bash
# Inscription
curl -i -X POST http://localhost:<port>/infinity/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"pilot42","password":"secret12","email":"pilot@example.com"}' \
  -c cookies.txt

# Connexion
curl -i -X POST http://localhost:<port>/infinity/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pilot42","password":"secret12"}' \
  -c cookies.txt

# Session courante
curl -i http://localhost:<port>/infinity/auth/me -b cookies.txt

# Déconnexion
curl -i -X POST http://localhost:<port>/infinity/auth/logout -b cookies.txt
```

### Accès direct NestJS (tests backend sans proxy)

```bash
curl -i -X POST http://localhost:4000/infinity/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"pilot42","password":"secret12","email":"pilot@example.com"}' \
  -c cookies.txt
```

---

## Checklist d'alignement serveur

Tâches restantes pour que le backend respecte ce contrat :

- [x] Ajouter `app.setGlobalPrefix('infinity')` dans `main.ts`
- [x] Configurer le reverse proxy : `/infinity/*` → `http://localhost:4000/infinity/*`
- [x] Remplacer `origin: '*'` par `appConfig.cors.origin` dans `main.ts` *(si accès cross-origin hors proxy)* — `main.ts` utilise `CORS_ORIGIN` via `ConfigService`
- [x] Poser le JWT dans un cookie `httpOnly` (`infinity_token`) au lieu du body `access_token`
- [x] Adapter `AuthService` pour retourner `{ user: { id, username, email } }`
- [x] Retourner `201` sur `register` (`@HttpCode(201)`)
- [x] Gérer les doublons `username` avec `409 Conflict`
- [x] Implémenter `GET /infinity/auth/me` avec guard cookie/JWT
- [x] Implémenter `POST /infinity/auth/logout` (suppression du cookie)
- [x] Étendre `JwtStrategy` pour lire le cookie en plus du header Bearer
- [x] `POST /infinity/auth/forgot-password` (stub)

---

## Documents liés

- [needed-enpoint.md](./stellar-gate/needed-enpoint.md) — liste initiale des endpoints attendus par le client
- [server-setup.md](./server-setup.md) — architecture générale du serveur Infinity
- [AGENTS.md](../AGENTS.md) — conventions de développement
