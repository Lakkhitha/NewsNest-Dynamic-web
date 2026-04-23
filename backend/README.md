# NewsNest Backend

## Quick Start

1. Create a PostgreSQL database named `newsnest`.
2. Copy `.env.example` to `.env` and adjust credentials.
3. Install dependencies:
   - `npm install`
4. Run migration:
   - `npm run db:migrate`
5. Seed demo data (100+ posts):
   - `npm run db:seed`
6. Start API server:
   - `npm run dev`

## Demo Accounts

- Admin: `admin@newsnest.app` / `Admin@123`
- User: `luna@newsnest.app` / `User@123`

## API Modules

- `/api/auth`
- `/api/feed`
- `/api/posts`
- `/api/social`
- `/api/admin`
