# Node Backend (Express + Sequelize + PostgreSQL)

An example / starter backend built with Express and Sequelize (Postgres). This repo demonstrates a real-world layout and the key tools you need to build an API: models, migrations, seeders, auth, tests, and common middleware.

Table of contents
- Project overview
- Quick start (setup & running)
- Sequelize & Postgres concepts (migrations, models, seeders)
- Common issues & troubleshooting
- Advanced tips
- Contributing & OSS information

---

## Project overview

- Express API with authentication (bcrypt + JWT)
- Role-based authorization middleware
- Sequelize used as an ORM for Postgres with separate `migrations` and `seeders`
- Testing with Jest and Supertest

Repository structure (high level)
- `src/` – application code (models, controllers, routes, middleware, services)
- `migrations/` – database migrations that create/alter tables and types
- `seeders/` – seed data to populate database for dev/test
- `tests/` – automated tests

---

## Quick start — local development

Prerequisites
- Node.js (v18+ recommended)
- Postgres instance (local or hosted)
- A `.env` file with a `DATABASE_URL` (and other vars)

1) Install

```bash
npm install
```

2) Configure environment

Copy `.env.example` to `.env` and update (DATABASE_URL, JWT_SECRET, PORT):

```bash
cp .env.example .env
# edit .env with your DB connection and secrets
```

3) Create DB, run migrations and seeders

Make sure Postgres is running and the connection string in `DATABASE_URL` points to the correct dev database.

Run migrations:

```bash
npx sequelize-cli db:migrate
```

Run seeders:

```bash
npx sequelize-cli db:seed:all
```

Or do both with the convenience script:

```bash
npm run setup-db
```

4) Start app (dev)

```bash
npm run dev
```

5) Tests

```bash
npm test
```

---

## Sequelize & PostgreSQL — concepts and how this project uses them

Migrations
- Migrations are code files under `migrations/` which declare how to create/alter tables and types.
- Always run `db:migrate` before `db:seed:all` — seeders assume tables already exist.

Models
- Models live in `src/models/` and map to tables. This project sets `freezeTableName: true` in config and individual models may define `tableName` explicitly.
- Naming: Postgres is case-sensitive for double-quoted identifiers. Using lower-case, plural table names (e.g. `users`) is conventional and avoids surprises. This repo contains examples of both conventions — be mindful when writing migrations/seeders.

Seeders
- Seeders are under `seeders/` and use `queryInterface.bulkInsert` / `bulkDelete` to add/remove data.
- Use seeders to create default accounts, roles, or other data.

Enums
- Postgres enums require special handling. When you add a new enum value, you need a migration that `ALTER TYPE ... ADD VALUE`.
- You cannot remove enum values easily without recreating types — so avoid relying on `down` to remove enum labels automatically.

Database config & options
- Config lives in `src/config/database.js` and reads `DATABASE_URL`.
- The project sets these defaults: timestamps: true, underscored: true, freezeTableName: true. Understand these values:
	- timestamps: adds `createdAt`/`updatedAt` fields
	- underscored: column names use snake_case
	- freezeTableName: prevents automatic pluralization

---

## Common issues and troubleshooting

- ERROR: relation "User" does not exist — means migrations haven't been applied for the target DB. Run `npx sequelize-cli db:migrate` first.
- invalid input value for enum enum_users_role: "customer" — the database's enum type does not contain that label. Add a migration to update the enum type (use `ALTER TYPE ... ADD VALUE`).
- Case / naming mismatches — ensure the table name you create in migrations matches `tableName` in models or the string used by your seeders.

Useful SQL checks (Postgres)

Check enum values for enum_users_role:
```sql
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t on e.enumtypid = t.oid
WHERE t.typname = 'enum_users_role';
```

Add an enum value (use migrations instead of running directly in production):
```sql
ALTER TYPE enum_users_role ADD VALUE 'customer';
```

Reset DB (dev) — WARNING: this will erase data
```bash
npx sequelize-cli db:drop
npx sequelize-cli db:create
npm run setup-db
```

---

## Advanced & production notes

- Indexing: add indexes in migrations for frequently queried columns (e.g. `email` unique index already added in migrations).
- Connection pooling: `src/config/database.js` can be tuned in `production` to configure connection pool sizes.
- Migrations in CI: run `npx sequelize-cli db:migrate --env test` or use a throwaway DB for integration tests.
- Rolling changes: when changing an enum or migrating sensitive columns, write migrations that transform the data while keeping backward compatibility.

---

## Contributing & open source

This repository is public/open-source-ready. If you plan to make it an open-source project:

- Add a LICENSE file (MIT/Apache/BSD/etc) to make the project's license explicit.
- Add a `CONTRIBUTING.md` and a PR template to describe the contribution workflow.
- Add tests for new features and add CI integration (GitHub Actions) to run migrations + tests.

If you want, I can:
- normalize the table naming to `users` across models/migrations/seeders to avoid naming issues, or
- add migration helpers for safely updating Postgres enums and show a best-practice upgrade pattern.

---

If anything in this README is inaccurate for your environment, tell me which area to expand or change and I’ll update it.
