# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev environment (Docker required)
docker compose up -d
docker compose logs api -f

# Rebuild API container after dependency changes
docker compose up -d --build api

# Run seed data
docker compose exec api npm run seed

# Run inside container
docker compose exec api npm run start:dev   # hot-reload (already running in Docker)
docker compose exec api npm run build
docker compose exec api npm run lint
docker compose exec api npm run test
docker compose exec api npm run test:watch
docker compose exec api npm run test:cov

# Run a single test file
docker compose exec api npx jest src/modules/auth/auth.service.spec.ts

# TypeORM migrations (run inside container or with local Node 20+)
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

**Ports (Docker):**
- API → `http://localhost:3001/api/v1`
- Swagger → `http://localhost:3001/api/docs`
- PostgreSQL → `localhost:5433` (user: `postgres`, pass: `secret`, db: `real_estate`)
- pgAdmin → `docker compose --profile tools up -d` → `http://localhost:5050`

## Architecture

### Global request pipeline

Every request passes through (in order, all registered in `AppModule` providers):
1. `JwtAuthGuard` — verifies access token; skips routes decorated with `@Public()`
2. `RolesGuard` — checks `@Roles(...)` metadata; passes if no roles required
3. `ValidationPipe` (global, in `main.ts`) — strips unknown fields (`whitelist`), transforms query params to typed classes (`transform: true`)
4. `HttpExceptionFilter` — shapes all errors into `{ statusCode, timestamp, path, message }`
5. `ClassSerializerInterceptor` — applies `@Exclude()` on entity fields (password, refreshTokenHash)
6. `TransformInterceptor` — wraps responses into `{ data }` or passes through `{ data, meta }` from `PaginatedResponse` unchanged

### Authentication flow

Two JWT tokens: access (15 min, full payload) and refresh (7 days, `sub` only).

- **Access token** validated by `JwtStrategy` (`passport-jwt`, name `'jwt'`) — attaches `{ id, email, role }` to `request.user`. No DB hit per request.
- **Refresh token** validated by `JwtRefreshStrategy` (`name 'jwt-refresh'`) — hits the DB, bcrypt-compares the raw token against the stored hash, then rotates (new hash saved, old invalidated).
- Use `@CurrentUser()` to extract the request user, `@CurrentUser('id')` for just the ID.
- Use `@Public()` on any route that must bypass `JwtAuthGuard`.

### Authorization pattern

Ownership checks live in the **service layer**, not the guard. Pattern used across modules:

```ts
// Service resolves userId → agentId before comparing with the entity's FK
const agent = await this.agentRepo.findOneBy({ userId });
if (!agent || entity.agentId !== agent.id) throw new ForbiddenException();
```

Admin bypasses all ownership checks (`if (userRole === Role.ADMIN) return`).

### TypeORM conventions

- **Relations** use object syntax: `relations: { images: true, agent: { user: true } }` (not array syntax — TypeORM 1.x requires this).
- **Select** uses object syntax: `select: { id: true, email: true }`.
- **nullable union types** on entity columns must declare the column type explicitly: `@Column({ type: 'varchar', nullable: true }) field: string | null` — TypeORM cannot infer the DB type from a union.
- `DB_SYNCHRONIZE=true` in `.env` for dev (auto-creates tables). Set to `false` for production and use migrations.
- The standalone `DataSource` in `src/config/data-source.ts` is only for the TypeORM CLI — not used by the NestJS app.

### Adding a new module

Each module follows this structure:
```
src/modules/<name>/
  entities/<name>.entity.ts
  dto/create-<name>.dto.ts
  dto/update-<name>.dto.ts
  <name>.service.ts
  <name>.controller.ts
  <name>.module.ts
```

Register in `AppModule` imports. If cross-module repository access is needed, import the entity via `TypeOrmModule.forFeature([OtherEntity])` in the consuming module (see `PropertiesModule` importing `Agent`).

### File uploads

`multerConfig` in `src/config/multer.config.ts` is used directly with `FilesInterceptor`/`FileInterceptor`. Files land in `./uploads/properties/` (local disk). URLs are served as static assets via `app.useStaticAssets` (prefix `/uploads`). Use `randomUUID()` from Node's built-in `crypto` module — **do not use the `uuid` npm package** (it is ESM-only and incompatible with CommonJS output).

### Config access

Config values are namespaced: `configService.get('jwt.accessSecret')`, `configService.get('database')`. Namespaces are defined in `src/config/database.config.ts` and `src/config/jwt.config.ts` via `registerAs`.

## Naming conventions

### Files

| Artifact | Pattern | Example |
|---|---|---|
| Module | `<name>.module.ts` | `appointments.module.ts` |
| Controller | `<name>.controller.ts` | `appointments.controller.ts` |
| Service | `<name>.service.ts` | `appointments.service.ts` |
| Entity | `<name>.entity.ts` | `appointment.entity.ts` (singular) |
| DTO | `<action>-<name>.dto.ts` | `create-appointment.dto.ts` |
| Guard | `<name>.guard.ts` | `jwt-auth.guard.ts` |
| Strategy | `<name>.strategy.ts` | `jwt-refresh.strategy.ts` |
| Decorator | `<name>.decorator.ts` | `current-user.decorator.ts` |
| Filter | `<name>.filter.ts` | `http-exception.filter.ts` |
| Interceptor | `<name>.interceptor.ts` | `transform.interceptor.ts` |
| Enum | `<name>.enum.ts` | `property-status.enum.ts` |

All filenames are **kebab-case**.

### TypeScript classes & symbols

| Artifact | Convention | Example |
|---|---|---|
| Class | `PascalCase` | `AppointmentsService` |
| Module class | `<Name>Module` | `AppointmentsModule` |
| Controller class | `<Name>Controller` | `AppointmentsController` |
| Service class | `<Name>Service` | `AppointmentsService` |
| Entity class | `PascalCase` singular | `Appointment` |
| DTO class | `<Action><Name>Dto` | `CreateAppointmentDto` |
| Enum | `PascalCase` | `AppointmentStatus` |
| Enum values | `SCREAMING_SNAKE_CASE` | `AppointmentStatus.PENDING` |
| Interface | `PascalCase` (no `I` prefix) | `JwtPayload` |
| Decorator function | `PascalCase` for class decorators, `camelCase` for param decorators | `@Roles(...)`, `@CurrentUser()` |
| Metadata key constant | `SCREAMING_SNAKE_CASE` | `ROLES_KEY`, `IS_PUBLIC_KEY` |

### Controllers & routes

- Controller class names are **plural**: `PropertiesController`, `AppointmentsController`.
- Route paths are **plural kebab-case**: `/properties`, `/property-images`, `/appointments`.
- Route parameters use camelCase in code (`propertyId`) but kebab in path if multi-word (`/property-images/:id`).
- HTTP verbs follow REST: `POST` create, `GET` read, `PATCH` partial update, `DELETE` remove. Never `PUT`.

### Services & repositories

- Repository injection: `@InjectRepository(Entity) private entityRepo: Repository<Entity>` — always named `<entity>Repo` (camelCase singular + `Repo`).
- Service methods: `findAll`, `findOne`, `create`, `update`, `remove` — mirror controller verbs.
- Private helpers end with a descriptive verb: `checkOwnership`, `generateTokens`, `sanitize`.

### Entities & database

- Entity class: **singular** (`Property`, not `Properties`).
- Table name: **plural snake_case** declared explicitly: `@Entity('property_images')`.
- Column names: **camelCase** in TypeScript → TypeORM maps to **snake_case** in PostgreSQL automatically.
- Foreign key columns are named `<relation>Id` (e.g., `agentId`, `propertyId`).
- Junction/pivot tables use composite `@Unique` constraint instead of a separate surrogate key when the pair is always unique (see `Favorite`).

### DTOs

- `Create<Name>Dto` — all required fields for creation.
- `Update<Name>Dto` — extends `PartialType(Create<Name>Dto)` to make all fields optional.
- Filter/query DTOs extend `PaginationDto` and are used exclusively as `@Query()` params.
- Every DTO property must have at least one `class-validator` decorator and one `@ApiProperty` / `@ApiPropertyOptional` decorator.
