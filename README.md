# Real Estate API

API REST complète pour une agence immobilière, construite avec **NestJS**, **TypeORM** et **PostgreSQL**.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | NestJS 11 |
| Langage | TypeScript 5 |
| Base de données | PostgreSQL 16 |
| ORM | TypeORM 1 |
| Authentification | JWT (access + refresh tokens) |
| Validation | class-validator / class-transformer |
| Documentation | Swagger / OpenAPI |
| Upload | Multer (stockage local) |
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
```

### 2. Lancer l'environnement Docker

```bash
docker compose up -d
```

Les services démarrent dans l'ordre : PostgreSQL → API (hot-reload activé).

### 3. Peupler la base de données

```bash
docker compose exec api npm run seed
```

### 4. Accéder à l'API

| Service | URL |
|---|---|
| API | http://localhost:3001/api/v1 |
| Swagger UI (interactif) | http://localhost:3001/api/docs |
| ReDoc (lecture) | http://localhost:3001/api/redoc |
| PostgreSQL | localhost:5433 |

---

## Comptes de test (après seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@immobilier.fr | Admin1234! |
| Agent 1 | marie.martin@immobilier.fr | Agent1234! |
| Agent 2 | pierre.dupont@immobilier.fr | Agent1234! |
| Agent 3 | sophie.bernard@immobilier.fr | Agent1234! |
| Client | client@example.fr | Client1234! |

---

## Variables d'environnement

Copier `.env.example` en `.env` et ajuster les valeurs :

```env
NODE_ENV=development
PORT=3000

# Base de données
DB_HOST=localhost        # Remplacé par "postgres" dans Docker
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secret
DB_DATABASE=real_estate
DB_SYNCHRONIZE=true      # false en production — utiliser les migrations

# JWT
JWT_ACCESS_SECRET=       # Clé secrète longue et aléatoire
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=      # Clé secrète différente de l'access
JWT_REFRESH_EXPIRES_IN=7d

# Upload
UPLOAD_DEST=./uploads/properties
MAX_FILE_SIZE=5242880    # 5 Mo
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp

# CORS
CORS_ORIGINS=http://localhost:3001
```

> **Note :** Dans Docker Compose, `DB_HOST` est automatiquement surchargé à `postgres` (nom du service).

---

## Structure du projet

```
src/
├── app.module.ts                   # Module racine — guards/filters/interceptors globaux
├── main.ts                         # Bootstrap — Swagger, ValidationPipe, CORS, static assets
│
├── config/
│   ├── database.config.ts          # Configuration TypeORM via @nestjs/config
│   ├── jwt.config.ts               # Secrets et durées JWT
│   ├── multer.config.ts            # Upload fichiers (destination, taille, types MIME)
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
│   │   ├── property-status.enum.ts     # available | sold | rented
│   │   └── appointment-status.enum.ts  # pending | confirmed | cancelled
│   └── pagination/
│       ├── pagination.dto.ts           # page + limit (query params)
│       └── paginated.response.ts       # { data[], meta: { total, page, limit, totalPages } }
│
├── modules/
│   ├── auth/                       # Authentification JWT
│   ├── users/                      # Gestion des utilisateurs et profils agents
│   ├── properties/                 # Annonces immobilières avec recherche filtrée
│   ├── property-images/            # Upload et gestion des photos d'annonces
│   ├── appointments/               # Rendez-vous entre clients et agents
│   └── favorites/                  # Favoris des utilisateurs
│
└── database/
    └── seeds/
        └── seed.ts                 # Données de test (admin, agents, propriétés, RDV)
```

---

## Endpoints de l'API

Le préfixe global est `/api/v1`. Les routes marquées 🔒 nécessitent un token JWT.

### Authentification

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Créer un compte |
| POST | `/auth/login` | Public | Se connecter, obtenir les tokens |
| POST | `/auth/refresh` | 🔒 Refresh token | Renouveler l'access token |
| POST | `/auth/logout` | 🔒 | Invalider le refresh token |
| GET | `/auth/profile` | 🔒 | Profil de l'utilisateur connecté |
| POST | `/auth/forgot-password` | Public | Demander un token de réinitialisation |
| POST | `/auth/reset-password` | Public | Réinitialiser le mot de passe via le token |

> **Réinitialisation de mot de passe :** En développement, le token brut est retourné directement dans la réponse. En production, il doit être envoyé par email. La route `/forgot-password` retourne toujours 200 pour éviter l'énumération d'utilisateurs.

**Exemple login :**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@immobilier.fr","password":"Admin1234!"}'
```

### Utilisateurs

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/users` | 🔒 Admin | Lister tous les utilisateurs (paginé) |
| GET | `/users/agents` | Public | Liste paginée de tous les agents |
| GET | `/users/me` | 🔒 | Mon profil |
| PATCH | `/users/me` | 🔒 | Modifier mon profil |
| PATCH | `/users/me/password` | 🔒 | Changer mon mot de passe (invalide toutes les sessions) |
| PATCH | `/users/me/avatar` | 🔒 | Uploader mon avatar |
| GET | `/users/me/properties` | 🔒 Agent/Admin | Mes annonces (tous statuts) — dashboard agent |
| PATCH | `/users/me/agent-profile` | 🔒 Agent | Modifier mon profil agent |
| GET | `/users/:id` | 🔒 Admin | Détail d'un utilisateur |
| PATCH | `/users/:id` | 🔒 Admin | Modifier un utilisateur |
| DELETE | `/users/:id` | 🔒 Admin | Supprimer un utilisateur |
| POST | `/users/:id/promote-agent` | 🔒 Admin | Promouvoir en agent |
| GET | `/users/:id/agent-profile` | Public | Profil public d'un agent |
| GET | `/users/:id/properties` | Public | Annonces disponibles d'un agent (paginé) |

### Propriétés

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/properties` | Public | Rechercher avec filtres + pagination |
| GET | `/properties/stats` | Public | Statistiques globales (par ville, catégorie, type, prix) |
| GET | `/properties/cities` | Public | Liste des villes avec annonces disponibles, triées par volume |
| GET | `/properties/:id` | Public | Détail d'une propriété |
| GET | `/properties/:id/similar` | Public | Annonces similaires (même catégorie/type, prix ±30%) |
| POST | `/properties` | 🔒 Agent/Admin | Créer une annonce |
| PATCH | `/properties/:id` | 🔒 Agent (own)/Admin | Modifier une annonce |
| DELETE | `/properties/:id` | 🔒 Agent (own)/Admin | Supprimer une annonce |

**Paramètres de recherche disponibles :**
```
GET /properties?search=villa+piscine
  &type=sale&category=apartment&city=Paris
  &minPrice=100000&maxPrice=500000
  &minRooms=2&minSurface=50
  &sortBy=price&order=ASC
  &page=1&limit=20
```

> `search` effectue une recherche insensible à la casse sur le titre, la description, l'adresse et la ville.

### Images de propriétés

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/properties/:id/images` | 🔒 Agent (own)/Admin | Upload jusqu'à 10 images |
| PATCH | `/property-images/:id/primary` | 🔒 Agent (own)/Admin | Définir comme image principale |
| DELETE | `/property-images/:id` | 🔒 Agent (own)/Admin | Supprimer une image |

### Rendez-vous

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/appointments` | 🔒 Client/Admin | Prendre un rendez-vous |
| GET | `/appointments` | 🔒 | Mes rendez-vous filtrés par rôle (paginé) |
| GET | `/appointments/:id` | 🔒 | Détail d'un rendez-vous |
| PATCH | `/appointments/:id` | 🔒 Client (own pending)/Admin | Reprogrammer (nouvelle date, repasse en pending) |
| PATCH | `/appointments/:id/status` | 🔒 Agent (own)/Admin | Confirmer ou annuler |
| DELETE | `/appointments/:id` | 🔒 Client (own)/Admin | Annuler un rendez-vous |

> Un agent ne peut pas avoir deux rendez-vous confirmés dans la même fenêtre d'1 heure.

### Favoris

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/favorites/:propertyId` | 🔒 | Ajouter aux favoris |
| DELETE | `/favorites/:propertyId` | 🔒 | Retirer des favoris |
| GET | `/favorites/check/:propertyId` | 🔒 | Vérifier si une propriété est en favori `{ favorited: bool }` |
| GET | `/favorites` | 🔒 | Mes favoris avec détail des propriétés (paginé) |

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

### Entités principales

**User** — `id`, `email`, `password` (bcrypt), `role`, `firstName`, `lastName`, `phone`, `avatar`

**Agent** — `id`, `userId`, `bio`, `licenseNumber`, `agency`

**Property** — `id`, `title`, `description`, `price`, `type`, `category`, `status`, `surface`, `rooms`, `bedrooms`, `bathrooms`, `address`, `city`, `zipCode`, `latitude`, `longitude`, `features` (JSONB)

**PropertyImage** — `id`, `propertyId`, `url`, `isPrimary`

**Appointment** — `id`, `propertyId`, `agentId`, `clientId`, `date`, `status`, `notes`

**Favorite** — `id`, `userId`, `propertyId` (contrainte unique composite)

---

## Format des réponses

Toutes les réponses sont enveloppées par le `TransformInterceptor` :

```json
// Réponse simple
{ "data": { ... } }

// Réponse paginée
{
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}

// Erreur
{
  "statusCode": 401,
  "timestamp": "2026-06-05T12:00:00.000Z",
  "path": "/api/v1/properties",
  "message": "Unauthorized"
}
```

---

## Authentification

L'API utilise deux tokens JWT :

- **Access token** (15 min) — envoyé dans le header `Authorization: Bearer <token>`
- **Refresh token** (7 jours) — utilisé sur `POST /auth/refresh` pour obtenir un nouveau access token

Le refresh token est stocké **hashé** (bcrypt) en base. À chaque refresh, le token est **rotatif** (l'ancien est invalidé immédiatement).

---

## Commandes disponibles

```bash
# Développement (hot-reload)
npm run start:dev

# Build production
npm run build

# Lancer en production
npm run start:prod

# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Seed (données de test)
npm run seed

# Migrations TypeORM
npm run migration:generate -- src/database/migrations/NomMigration
npm run migration:run
npm run migration:revert
```

---

## Commandes Docker

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs de l'API
docker compose logs api -f

# Exécuter une commande dans le container
docker compose exec api npm run seed

# Arrêter les services
docker compose down

# Arrêter et supprimer les volumes (reset BDD)
docker compose down -v

# Reconstruire l'image après changement de dépendances
docker compose up -d --build api

# Lancer pgAdmin (interface graphique BDD)
docker compose --profile tools up -d
# Accès : http://localhost:5050 — admin@admin.com / admin
```

---

## Connexion à la base de données

**Depuis VS Code** (extension SQLTools) :

| Champ | Valeur |
|---|---|
| Host | localhost |
| Port | 5433 |
| Database | real_estate |
| Username | postgres |
| Password | secret |

**Depuis psql :**
```bash
docker compose exec postgres psql -U postgres -d real_estate
```

---

### Admin

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/admin/stats` | 🔒 Admin | Stats globales : utilisateurs, agents, propriétés, rendez-vous par statut |

---

## Rôles utilisateurs

L'API définit trois rôles, attribués à la création du compte ou par promotion admin.

### `client` — Visiteur authentifié

Rôle par défaut à l'inscription.

| Peut faire | Ne peut pas faire |
|---|---|
| Parcourir et rechercher les annonces | Créer ou modifier des annonces |
| Consulter les profils agents | Accéder aux données d'autres utilisateurs |
| Ajouter / retirer des favoris | Confirmer ou refuser un rendez-vous |
| Prendre un rendez-vous de visite | Voir les rendez-vous des autres clients |
| Annuler ou reprogrammer ses propres rendez-vous en attente | Gérer les utilisateurs |
| Modifier son profil et son mot de passe | — |

---

### `agent` — Conseiller immobilier

Promu depuis un compte `client` par un administrateur (`POST /users/:id/promote-agent`).

| Peut faire | Ne peut pas faire |
|---|---|
| Créer, modifier, supprimer ses propres annonces | Modifier les annonces des autres agents |
| Uploader et gérer les images de ses annonces | Supprimer un utilisateur |
| Voir et gérer ses propres rendez-vous | Voir les rendez-vous des autres agents |
| Confirmer ou refuser ses rendez-vous | Prendre un rendez-vous (rôle client) |
| Modifier son profil agent (bio, agence, licence) | Promouvoir un autre utilisateur |
| Consulter toutes ses annonces (tous statuts) via `/users/me/properties` | — |

---

### `admin` — Administrateur

Compte créé manuellement (seed ou promotion directe en base).

| Peut faire |
|---|
| Toutes les actions des rôles `client` et `agent` |
| Lister, modifier et supprimer n'importe quel utilisateur |
| Promouvoir un utilisateur en agent |
| Créer, modifier et supprimer n'importe quelle annonce |
| Voir tous les rendez-vous (tous rôles confondus) |
| Confirmer ou annuler n'importe quel rendez-vous |
| Consulter les statistiques globales (`GET /admin/stats`) |

---

### Résumé des permissions par route

| Action | client | agent | admin |
|---|:---:|:---:|:---:|
| Voir les annonces | ✅ | ✅ | ✅ |
| Créer une annonce | ❌ | ✅ | ✅ |
| Modifier / supprimer une annonce | ❌ | ✅ own | ✅ |
| Uploader des images | ❌ | ✅ own | ✅ |
| Ajouter aux favoris | ✅ | ✅ | ✅ |
| Prendre un rendez-vous | ✅ | ❌ | ✅ |
| Confirmer un rendez-vous | ❌ | ✅ own | ✅ |
| Annuler / reprogrammer un RDV | ✅ own | ❌ | ✅ |
| Voir tous les utilisateurs | ❌ | ❌ | ✅ |
| Supprimer un utilisateur | ❌ | ❌ | ✅ |
| Promouvoir en agent | ❌ | ❌ | ✅ |
| Stats globales | ❌ | ❌ | ✅ |

---

## Politique d'autorisation

| Ressource | Créer | Lire | Modifier | Supprimer |
|---|---|---|---|---|
| Utilisateur | Public (register) | Admin / Soi-même | Admin / Soi-même | Admin |
| Profil agent | Admin | Public | Admin / Soi-même | Admin |
| Propriété | Agent / Admin | Public | Agent (own) / Admin | Agent (own) / Admin |
| Image propriété | Agent (own) / Admin | Public | Agent (own) / Admin | Agent (own) / Admin |
| Rendez-vous | Client / Admin | Admin (tous) / Own | Agent (own) / Admin | Client (own pending) / Admin |
| Favori | Authentifié | Soi-même | — | Soi-même |

---

## Développement sans Docker

```bash
# Installer les dépendances
npm install

# Configurer .env avec un PostgreSQL local accessible sur localhost:5432
# puis lancer
npm run start:dev
```
