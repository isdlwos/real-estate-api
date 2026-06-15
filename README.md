# Real Estate API — Prestige Immobilier

API REST complète pour une agence immobilière de prestige au Sénégal, construite avec **NestJS**, **TypeORM** et **PostgreSQL**.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | NestJS 11 |
| Langage | TypeScript 5 |
| Base de données | PostgreSQL 16 |
| ORM | TypeORM 0.3 |
| Authentification | JWT (access 15 min + refresh 7 j, rotation) |
| Validation | class-validator / class-transformer |
| Documentation | Swagger UI + ReDoc |
| Upload images | Multer (memory) → Cloudinary (CDN) |
| Rate limiting | @nestjs/throttler |
| Sécurité HTTP | Helmet (CSP, HSTS, X-Frame-Options…) |
| Conteneurisation | Docker / Docker Compose |

---

## Prérequis

- [Docker](https://www.docker.com/) & Docker Compose v2
- Node.js 20+ (uniquement pour le développement sans Docker)

---

## Démarrage rapide

### 1. Cloner et configurer

```bash
git clone <repo-url>
cd real-estate-api
cp .env.example .env
# Éditer .env et remplir les valeurs (voir section Variables d'environnement)
```

### 2. Lancer l'environnement Docker

```bash
docker compose up -d
```

Les services démarrent dans l'ordre : PostgreSQL → API (hot-reload activé).

### 3. Appliquer les migrations et peupler la base

```bash
docker compose exec api npm run migration:run
docker compose exec api npm run seed
```

### 4. Accéder à l'API

| Service | URL |
|---|---|
| API | http://localhost:3001/api/v1 |
| Swagger UI | http://localhost:3001/api/docs |
| ReDoc | http://localhost:3001/api/redoc |
| Health check | http://localhost:3001/api/v1/health/liveness |
| PostgreSQL | localhost:5433 |

> Swagger et ReDoc sont disponibles uniquement en `NODE_ENV=development`.

---

## Comptes de test (après seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@prestige-immobilier.sn | Admin1234! |
| Agent 1 | aminata.diallo@prestige-immobilier.sn | Agent1234! |
| Agent 2 | moussa.ndiaye@prestige-immobilier.sn | Agent1234! |
| Agent 3 | fatou.sow@prestige-immobilier.sn | Agent1234! |
| Client | client@prestige-immobilier.sn | Client1234! |

---

## Variables d'environnement

Copier `.env.example` en `.env` et remplir les valeurs :

```env
NODE_ENV=development
PORT=3000

# Base de données
DB_HOST=localhost        # Remplacé par "postgres" dans Docker
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secret
DB_DATABASE=real_estate
DB_SYNCHRONIZE=false     # Toujours false — utiliser migration:run
DB_LOGGING=true

# JWT — générer avec : openssl rand -base64 32
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

# Upload
MAX_FILE_SIZE=5242880    # 5 Mo
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3002

# Cloudinary — dashboard.cloudinary.com → Settings → API Keys
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

> Dans Docker Compose, `DB_HOST` est automatiquement surchargé à `postgres` (nom du service).

---

## Structure du projet

```
src/
├── app.module.ts                   # Module racine — guards/filters/interceptors globaux
├── main.ts                         # Bootstrap — Helmet, Swagger, ValidationPipe, CORS
│
├── config/
│   ├── database.config.ts          # Configuration TypeORM via @nestjs/config
│   ├── jwt.config.ts               # Secrets et durées JWT
│   ├── multer.config.ts            # Upload (memory storage → Cloudinary)
│   ├── env.validation.ts           # Validation des variables d'env au démarrage
│   └── data-source.ts              # DataSource standalone pour la CLI TypeORM
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() — extrait le user du JWT
│   │   ├── public.decorator.ts         # @Public() — exclut une route du guard global
│   │   └── roles.decorator.ts          # @Roles(...) — restreint par rôle
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # Vérifie l'access token (global par défaut)
│   │   ├── jwt-refresh.guard.ts        # Vérifie le refresh token
│   │   └── roles.guard.ts              # Vérifie le rôle requis (global)
│   ├── filters/
│   │   └── http-exception.filter.ts    # Format d'erreur cohérent
│   ├── interceptors/
│   │   └── transform.interceptor.ts    # Enveloppe les réponses dans { data, meta }
│   ├── enums/
│   │   ├── role.enum.ts                # admin | agent | client
│   │   ├── property-type.enum.ts       # sale | rent
│   │   ├── property-category.enum.ts   # apartment | house | land | commercial
│   │   ├── property-status.enum.ts     # available | sold | rented | draft
│   │   └── appointment-status.enum.ts  # pending | confirmed | cancelled
│   └── pagination/
│       ├── pagination.dto.ts           # page + limit (query params)
│       └── paginated.response.ts       # { data[], meta: { total, page, limit, totalPages } }
│
├── health/
│   └── health.controller.ts        # GET /health/liveness — probe Docker/load balancer
│
├── modules/
│   ├── auth/                       # Authentification JWT (register, login, refresh, logout)
│   ├── users/                      # Profils, avatar, promotion agent
│   ├── properties/                 # Annonces avec recherche filtrée et pagination
│   ├── property-images/            # Upload Cloudinary, set-primary, delete
│   ├── cloudinary/                 # Service d'upload/suppression Cloudinary
│   ├── appointments/               # Rendez-vous agents/clients
│   ├── favorites/                  # Favoris utilisateurs
│   └── admin/                      # Stats globales (admin uniquement)
│
└── database/
    ├── migrations/                 # Migrations TypeORM — ne jamais modifier après exécution
    └── seeds/
        └── seed.ts                 # Données de test (admin, 3 agents, 10 propriétés, RDV)
```

---

## Endpoints de l'API

Le préfixe global est `/api/v1`. Les routes marquées 🔒 nécessitent un token JWT.

### Authentification

| Méthode | Route | Accès | Limite | Description |
|---|---|---|---|---|
| POST | `/auth/register` | Public | 10/min | Créer un compte |
| POST | `/auth/login` | Public | 5/min | Se connecter, obtenir les tokens |
| POST | `/auth/refresh` | 🔒 Refresh token | — | Renouveler l'access token |
| POST | `/auth/logout` | 🔒 | — | Invalider le refresh token |
| GET | `/auth/profile` | 🔒 | — | Profil de l'utilisateur connecté |
| POST | `/auth/forgot-password` | Public | 3/min | Demander un token de réinitialisation |
| POST | `/auth/reset-password` | Public | — | Réinitialiser le mot de passe |

> **Réinitialisation :** En développement, le token est retourné dans la réponse. En production, l'envoi par email est à implémenter. La route `/forgot-password` retourne toujours 200 pour éviter l'énumération d'utilisateurs.

### Utilisateurs

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/users` | 🔒 Admin | Lister tous les utilisateurs (paginé) |
| GET | `/users/agents` | Public | Liste paginée des agents |
| GET | `/users/me` | 🔒 | Mon profil |
| PATCH | `/users/me` | 🔒 | Modifier mon profil |
| PATCH | `/users/me/password` | 🔒 | Changer mon mot de passe |
| PATCH | `/users/me/avatar` | 🔒 | Uploader mon avatar |
| GET | `/users/me/properties` | 🔒 Agent/Admin | Mes annonces (tous statuts) |
| PATCH | `/users/me/agent-profile` | 🔒 Agent | Modifier mon profil agent |
| GET | `/users/:id` | 🔒 Admin | Détail d'un utilisateur |
| PATCH | `/users/:id` | 🔒 Admin | Modifier un utilisateur |
| DELETE | `/users/:id` | 🔒 Admin | Supprimer un utilisateur |
| POST | `/users/:id/promote-agent` | 🔒 Admin | Promouvoir en agent |
| GET | `/users/:id/agent-profile` | Public | Profil public d'un agent |
| GET | `/users/:id/properties` | Public | Annonces disponibles d'un agent |

### Propriétés

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/properties` | Public | Rechercher avec filtres + pagination |
| GET | `/properties/stats` | Public | Statistiques globales |
| GET | `/properties/cities` | Public | Villes avec annonces disponibles |
| GET | `/properties/:id` | Public | Détail d'une propriété |
| GET | `/properties/:id/similar` | Public | Annonces similaires (même catégorie, prix ±30%) |
| POST | `/properties` | 🔒 Agent/Admin | Créer une annonce |
| PATCH | `/properties/:id` | 🔒 Agent (own)/Admin | Modifier une annonce |
| DELETE | `/properties/:id` | 🔒 Agent (own)/Admin | Supprimer une annonce |

**Paramètres de recherche :**
```
GET /properties?search=villa&type=sale&category=apartment&city=Dakar
  &minPrice=10000000&maxPrice=100000000&minRooms=2&minSurface=50
  &sortBy=price&order=ASC&page=1&limit=20
```

### Images de propriétés

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/properties/:id/images` | 🔒 Agent (own)/Admin | Upload jusqu'à 10 images vers Cloudinary |
| PATCH | `/property-images/:id/primary` | 🔒 Agent (own)/Admin | Définir comme image principale |
| DELETE | `/property-images/:id` | 🔒 Agent (own)/Admin | Supprimer de Cloudinary + base |

> Les images sont uploadées sur Cloudinary dans le dossier `prestige-immobilier/properties/{propertyId}/` avec conversion WebP et CDN automatiques.

### Rendez-vous

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/appointments` | 🔒 Client/Admin | Prendre un rendez-vous |
| GET | `/appointments` | 🔒 | Mes rendez-vous (filtrés par rôle) |
| GET | `/appointments/:id` | 🔒 | Détail d'un rendez-vous |
| PATCH | `/appointments/:id` | 🔒 Client (own)/Admin | Reprogrammer |
| PATCH | `/appointments/:id/status` | 🔒 Agent (own)/Admin | Confirmer ou annuler |
| DELETE | `/appointments/:id` | 🔒 Client (own)/Admin | Supprimer |

### Favoris

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/favorites/:propertyId` | 🔒 | Ajouter aux favoris |
| DELETE | `/favorites/:propertyId` | 🔒 | Retirer des favoris |
| GET | `/favorites/check/:propertyId` | 🔒 | Vérifier `{ favorited: bool }` |
| GET | `/favorites` | 🔒 | Mes favoris avec détail des propriétés |

### Admin & Health

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/admin/stats` | 🔒 Admin | KPIs globaux |
| GET | `/health/liveness` | Public | Probe Docker / load balancer |

---

## Modèle de données

```
User ──────────── Agent (1-1)
  │                  │
  │              Property (1-N)
  │                  │
  ├── Appointment ───┤
  │     (client)  (agent)
  │
  └── Favorite ── Property
```

**PropertyImage** — `id`, `propertyId`, `url` (Cloudinary HTTPS), `publicId` (pour suppression), `isPrimary`

---

## Format des réponses

```json
{ "data": { ... } }

{
  "data": [ ... ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}

{
  "statusCode": 401,
  "timestamp": "2026-06-12T10:00:00.000Z",
  "path": "/api/v1/properties",
  "message": "Unauthorized"
}
```

---

## Authentification

Deux tokens JWT :
- **Access token** (15 min) — header `Authorization: Bearer <token>`
- **Refresh token** (7 jours) — stocké **hashé** (bcrypt), **rotatif** à chaque refresh

---

## Migrations TypeORM

```bash
# Générer une migration après modification d'une entité
docker compose exec api npm run migration:generate -- src/database/migrations/NomDuChangement

# Appliquer toutes les migrations en attente
docker compose exec api npm run migration:run

# Annuler la dernière migration
docker compose exec api npm run migration:revert
```

> Ne jamais modifier un fichier de migration déjà exécuté en production.

---

## Commandes disponibles

```bash
npm run start:dev          # Développement (hot-reload)
npm run build              # Build production
npm run start:prod         # Lancer en production
npm run test               # Tests unitaires
npm run seed               # Données de test
npm run migration:generate # Générer une migration
npm run migration:run      # Appliquer les migrations
npm run migration:revert   # Annuler la dernière migration
```

---

## Commandes Docker

```bash
docker compose up -d                    # Démarrer
docker compose logs api -f              # Logs de l'API
docker compose exec api npm run seed    # Seed
docker compose down                     # Arrêter
docker compose down -v                  # Arrêter + reset BDD
docker compose up -d --build api        # Rebuild après changement de dépendances
docker compose --profile tools up -d    # Lancer pgAdmin (http://localhost:5050)
```

---

## Déploiement en production

Voir `docker-compose.prod.yml` à la racine du monorepo et `PRODUCTION_CHECKLIST.md`.

```bash
# Générer les secrets
openssl rand -base64 32   # JWT_ACCESS_SECRET
openssl rand -base64 32   # JWT_REFRESH_SECRET
openssl rand -base64 24   # DB_PASSWORD

# Lancer en production (depuis la racine du monorepo)
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api npm run migration:run
```

---

## Connexion à la base (développement)

```bash
docker compose exec postgres psql -U postgres -d real_estate
```

Depuis VS Code (extension SQLTools) : `localhost:5433` / `postgres` / `secret` / `real_estate`
