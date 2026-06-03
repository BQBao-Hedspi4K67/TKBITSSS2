# Tempo Schedule Builder

Production foundation for the Tempo schedule builder, rebuilt from the existing mock FE flow and structured as a React frontend, Node.js + Express backend, and MySQL database powered by Prisma.

The current implementation keeps the mock UX direction intact: upload timetable file, review subjects, pick classes, preview conflicts, and prepare saved/share schedule foundations without redesigning the workflow.

## What Is Included In Phase 1

- JWT login/logout.
- Protected routes for authenticated users.
- Student role only.
- Excel/CSV upload handled in the backend.
- Flexible timetable column normalization.
- Subject selection with search and counts.
- Class selection per subject.
- Conflict preview foundation for selected classes.
- Saved schedule, share schedule, and conflict engine data models prepared in the database.

## Tech Stack

- Frontend: React 19, TypeScript, Vite 6, Zustand, React Router.
- Backend: Node.js, Express, TypeScript, JWT, Multer, XLSX.
- Database: MySQL with Prisma ORM.
- Validation: Zod on the backend, typed UI contracts on the frontend.

## Repository Structure

- `frontend/` React app with pages, components, hooks, store, services, utils, and styles.
- `backend/` Express API with controllers, services, validators, middleware, and config.
- `prisma/` Prisma schema and seed script.
- `database/` XAMPP-compatible SQL import for manual MySQL setup.
- `tempo_schedule_builder_mockup-1 (1).html` original mock FE reference.

## Frontend Structure

- `src/pages/` route-level screens such as login and schedule builder.
- `src/components/` reusable UI grouped by layout, auth, upload, subjects, schedule, and common.
- `src/services/` API wrappers for auth and timetable flows.
- `src/store/` persisted Zustand state for auth and imported timetable data.
- `src/hooks/` state helpers for auth and timetable import.
- `src/utils/` timetable formatting and local conflict detection helpers.
- `src/styles/` global styling that keeps the mock look and feel.

## Backend Structure

- `src/routes/` REST route registration.
- `src/controllers/` HTTP layer.
- `src/services/` business logic for auth, timetable import, schedules, and conflicts.
- `src/validators/` Zod schemas.
- `src/middlewares/` auth and error handling.
- `src/utils/` Excel parsing, time normalization, and error helpers.
- `src/config/` environment and Prisma client setup.

## Database Design

The schema is prepared for the scheduling engine and future saved/share features:

- `User` stores student accounts and JWT identity.
- `ImportBatch` stores each imported file and validation metadata.
- `ImportedSection` stores normalized timetable rows and the raw row payload.
- `Schedule` stores saved schedules.
- `ScheduleItem` stores selected sections in a schedule.
- `ScheduleConflict` stores detected conflicts.
- `ScheduleShare` stores share links and permissions.

This design is intentionally broader than Phase 1 so later work can add recommendation, compare, share, and export features without restructuring the database.

## Preserved Flow

The flow stays close to the mock FE:

1. Login.
2. Upload timetable file.
3. Validate and normalize the timetable in the backend.
4. Show subject list with search.
5. Select or deselect subjects.
6. Drill into a subject to see available classes.
7. Pick classes and preview conflicts.
8. Prepare schedule saving and sharing foundation.

## Key UI Screens

- Login screen.
- Upload Excel screen.
- Subject selection screen.
- Class selection screen.
- Dashboard / conflict preview screen.
- Saved schedules placeholder.
- Conflict filter placeholder.

## Important Features

- Drag and drop upload on the frontend.
- Backend parsing of `.xlsx`, `.xls`, and `.csv`.
- Flexible column normalization for spacing, case, and naming variations.
- Clear missing-column errors when the file is not a valid timetable.
- Subject and class grouping based on imported file data.
- Conflict preview foundation for overlapping and short-gap classes.
- JWT-based auth and protected routes.

## API Overview

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Imports

- `POST /api/imports/timetable`
- `GET /api/imports/timetable/:batchId`

### Schedules

- `POST /api/schedules/conflicts/preview`
- `POST /api/schedules`
- `GET /api/schedules`
- `DELETE /api/schedules/:scheduleId`
- `POST /api/schedules/:scheduleId/shares`

## Timetable File Rules

The backend accepts the official HUST 20252 workbook structure and normalizes headers by trimming spaces, ignoring case, and removing accents/underscore differences.

The real workbook structure expected by the parser is:

- Title row in row 1.
- Blank separator row in row 2.
- Header row in row 3.
- Data starts from row 4.

The importer expects these official columns to be present in the header row: `Mã_lớp`, `Mã_HP`, `Tên_HP`, `Thứ`, `Thời_gian`, `BĐ`, `KT`, `Kíp`, `Tuần`, `Phòng`, `SL_Max`, `Loại_lớp`, `Đợt_mở`, `Mã_QL`.

The workbook may also include extra operational columns such as `Kỳ`, `Trường_Viện_Khoa`, `Mã_lớp_kèm`, `Ghi_chú`, `Buổi_số`, `Cần_TN`, `SLĐK`, `Trạng_thái`, or `TeachingType`. Those are preserved when present, but the parser only relies on the official timetable columns for validation.

If the file is invalid, the API rejects it and returns the missing required columns explicitly. Import is blocked until the file matches timetable format expectations.

## Validation Notes

- Missing required columns are reported with clear labels.
- Empty files are rejected.
- Files with malformed rows are rejected.
- Timetable import is handled entirely on the backend.
- Protected endpoints require a Bearer token.
- The same `Mã_lớp` can appear on multiple rows. Those rows represent multiple meetings of one class and should be treated as one class entity when building selection logic.

## Local Development

### Prerequisites

- Node.js 20.x or newer is recommended.
- XAMPP MySQL or another MySQL 8.x server.

### Install

```bash
npm install
```

### Option A: Use Prisma Migrate with XAMPP MySQL

1. Start MySQL in XAMPP.
2. Create a database named `tempo` in phpMyAdmin.
3. Update `DATABASE_URL` in `.env` and `backend/.env` to match your MySQL credentials.

Example for the default XAMPP root user with no password:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/tempo"
```

### Prepare Prisma

```bash
npm run db:migrate
npm run db:seed
```

### Option B: Import SQL manually in phpMyAdmin

If Prisma migrate fails in your XAMPP environment, import [database/tempo_xampp_schema_seed.sql](database/tempo_xampp_schema_seed.sql) in phpMyAdmin.

That file will:

- create the `tempo` database if it does not exist,
- create all application tables,
- insert the demo student user `student@tempo.local`.

After importing, you can still run `npm run db:generate` so Prisma Client stays in sync.

### Run the apps

```bash
npm run dev
```

If port `5173` is already occupied, Vite will automatically fall back to the next available port.

If XAMPP MySQL is already using a different port, change `DATABASE_URL` accordingly before starting the backend.

## Deployment

### Render backend

1. Create a new Render Web Service from this repository.
2. Use the `render.yaml` blueprint in the repo root, or set these values manually:
	- Root Directory: `backend`
	- Build Command: `npm install && npm run prisma:generate && npm run build`
	- Start Command: `npm start`
3. Set the environment variables in Render:
	- `NODE_ENV=production`
	- `PORT=10000` or leave Render to assign the port and keep the app reading `process.env.PORT`
	- `DATABASE_URL=<your TiDB Cloud MySQL URL with ?sslaccept=strict>`
	- `JWT_SECRET=<strong production secret>`
	- `JWT_EXPIRES_IN=7d`
	- `CORS_ORIGIN=*`
4. Deploy and copy the Render backend URL, for example `https://tempo-backend.onrender.com`.

### Vercel frontend

1. Create a new Vercel project from the same repository.
2. Set the Root Directory to `frontend`.
3. Set the environment variable:
	- `VITE_API_URL=https://tempo-backend.onrender.com/api`
4. Deploy.
5. If you change the backend domain later, update `VITE_API_URL` and redeploy the frontend.

### Notes

- The frontend uses React Router with `BrowserRouter`, so the `frontend/vercel.json` rewrite is required for refresh and direct links to work.
- The backend CORS setting already allows all origins with `CORS_ORIGIN=*`, which is suitable for deploy-time frontend domains.
- TiDB Cloud requires `?sslaccept=strict` in the MySQL connection string.

## Demo Login

- Email: `student@tempo.local`
- Password: `Password@123`

## Notes On Current Scope

- UI/UX remains aligned to the mock FE direction rather than being redesigned.
- Phase 1 focuses on auth, upload, subject selection, and class selection.
- Saved schedules, sharing, and richer schedule engine capabilities are scaffolded in the backend and database, ready for the next phase.
- The repository now supports a manual XAMPP MySQL path when Prisma migrate is unavailable.

## XAMPP Setup Checklist

1. Open XAMPP and start MySQL.
2. Open phpMyAdmin and create a database named `tempo` with `utf8mb4_unicode_ci` collation.
3. Import [database/tempo_xampp_schema_seed.sql](database/tempo_xampp_schema_seed.sql).
4. Set `DATABASE_URL="mysql://root:@127.0.0.1:3306/tempo"` in both `.env` and `backend/.env` if you use the default XAMPP root account without a password.
5. Run `npm install`.
6. Run `npm run dev`.
7. Sign in with `student@tempo.local` / `Password@123`.

## Known Future Work

- Persist the full schedule-builder state across sessions.
- Connect saved schedules and share links to the frontend screens.
- Expand conflict rules and location-aware warnings.
- Add recommendation scoring and plan comparison.
- Add export flows such as `.ics`.

## Reference

The original mock reference remains in `tempo_schedule_builder_mockup-1 (1).html` for UI parity and flow comparison.
