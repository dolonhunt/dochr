# DocHR

Production-ready HR document generator for Bangladesh payroll workflows.

## Stack
- Next.js 16 (App Router)
- Prisma + SQLite
- Tailwind + shadcn UI
- Puppeteer for PDF rendering

## Local setup
1. Install dependencies:
   - `npm install`
2. Prepare environment:
   - `copy .env.example .env`
3. Generate Prisma client:
   - `npm run db:generate`
4. Initialize DB schema:
   - `npm run db:push`
5. Start dev server:
   - `npm run dev`

## Production checks
- `npm run lint`
- `npm run build`
- `npm run start`

## Data model
- Employees and company settings are stored in SQLite through Prisma.
- First run seeds default company and one employee via `POST /api/bootstrap`.

## Vercel
- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Env:
  - `DATABASE_URL=file:./db/custom.db`

Note: SQLite is suitable for single-instance or low-concurrency workloads. For multi-instance production, migrate Prisma datasource to Postgres.
