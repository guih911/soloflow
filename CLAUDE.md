# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoloFlow is a workflow/process management system with digital signatures, RBAC, and LGPD compliance. It targets the Brazilian market (Portuguese language throughout). Monorepo with two apps:

- **soloflow-backend**: NestJS 11 REST API (TypeScript, PostgreSQL via Prisma, Redis cache, Cloudflare R2 storage)
- **soloflow-frontend**: Vue 3 SPA (TypeScript, Vuetify 3, Pinia, Vite 7)

## Commands

### Backend (`soloflow-backend/`)

```bash
npm run start:dev          # Dev server with hot reload (port 3000)
npm run build              # Compile to dist/
npm run start              # Production: node dist/src/main.js
npm run lint               # ESLint + fix
npm run test               # Jest unit tests
npm run test:watch         # Jest watch mode
npm run test:e2e           # E2E tests (jest-e2e.json config)
npm run prisma:generate    # Regenerate Prisma client after schema changes
npm run prisma:migrate     # Run database migrations
npm run prisma:seed        # Seed database (ts-node prisma/seed.ts)
npm run prisma:studio      # Prisma Studio web UI
```

### Frontend (`soloflow-frontend/`)

```bash
npm run dev                # Vite dev server (port 5173, proxies /api to :3000)
npm run build              # vue-tsc type check + vite build
npm run preview            # Preview production build
```

## Architecture

### Backend Module Structure

NestJS modular architecture in `src/modules/`. Each module follows the pattern: `module.ts`, `controller.ts`, `service.ts`, DTOs in `dto/` subdirectory.

Key modules:
- **auth** — JWT authentication (passport-jwt + passport-local), bcrypt passwords, refresh token rotation, session management, company switching
- **processes** — Core workflow engine: process instances, step execution, form data handling, status transitions
- **process-types** — Workflow template definitions with versioning (draft/published states)
- **signatures** — Digital signature workflows (SEQUENTIAL/PARALLEL), PDF signing with pdf-lib, QR code validation
- **storage** — Cloudflare R2 (S3-compatible) file uploads via Multer memory storage
- **profiles** — RBAC with resource-action permissions and process-type-specific grants
- **lgpd** — LGPD compliance: CPF encryption, consent tracking, data deletion requests, audit logging
- **child-processes** — Sub-process spawning (MANUAL/RECURRENT/SCHEDULED)
- **sub-tasks** — Sub-task templates and execution within steps

### Database (Prisma)

Schema at `prisma/schema.prisma` with 30+ models. Key relationships:

- `ProcessType` → `ProcessTypeVersion` → `StepVersion` → `FormFieldVersion` (versioned workflow definitions)
- `ProcessInstance` → `StepExecution` → `SubTask` / `Attachment` (runtime execution)
- `User` → `UserCompany` → `Company` (multi-tenant)
- `Profile` → `user_profiles` → permissions (RBAC)
- Step types: INPUT, APPROVAL, UPLOAD, REVIEW, SIGNATURE
- Assignment types: USER, SECTOR, ROLE, CONDITIONAL

After schema changes: run `prisma:generate` then `prisma:migrate`.

### Frontend Structure

- **Views** (`src/views/`): Page components mapped to routes
- **Stores** (`src/stores/`): Pinia stores manage state and API calls. `auth.js` handles token, user, permissions, company context
- **Services** (`src/services/api.js`): Axios instance with JWT interceptor and token refresh logic
- **Router** (`src/router/index.js`): Route guards check `authStore.hasPermission(resource, action)`
- **Layouts**: `AuthLayout.vue` (login) and `DashboardLayout.vue` (authenticated shell)
- **Components** (`src/components/`): Reusable UI components (file upload, document viewer, dialogs)

### Auth Flow

1. Login returns JWT + refresh token. Token payload: `userId`, `companyId`, `email`
2. Frontend stores token/user/permissions in localStorage and Pinia
3. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
4. Backend guards: `JwtAuthGuard` → `ScopeGuard` → `RateLimitGuard`
5. Permission model: `hasPermission(resource, action)` where `*` is wildcard

### Multi-tenancy

Users belong to multiple companies via `UserCompany`. Active company is set via `POST /auth/switch-company`. All queries are scoped to the active company's context.

## Environment Setup

Backend requires `.env` (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET`, `JWT_EXPIRATION` (default 2h), `JWT_REFRESH_EXPIRATION` (default 7d)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional, falls back to in-memory)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `ENCRYPTION_KEY` — For LGPD CPF encryption
- `CORS_ORIGINS`

Frontend `.env`:
- `VITE_API_URL=http://localhost:3000`

## Conventions

- All user-facing text is in Brazilian Portuguese
- Commit messages are in Portuguese
- Backend uses class-validator DTOs for request validation
- Files uploaded via Multer memory storage, then streamed to R2 (folders: `anexos/`, `subtarefas/`, `assinaturas/`)
- Security headers configured in `main.ts` (CSP, HSTS, X-Frame-Options, etc.)
- Password hashing: bcrypt with 10 salt rounds
- UUIDs for all primary keys
