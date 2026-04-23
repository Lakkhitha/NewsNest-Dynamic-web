# NewsNest - Fullstack News Social Platform

NewsNest is a fullstack, mobile-responsive social news platform for posting, discussing, moderating, and discovering news.

This guide is written for running the project on a new PC after copying the source code.

## Features

- JWT authentication with role-based access
- News feed, explore, trending, and post detail pages
- Reactions, comments, follows, reports, and feedback
- Messaging and notifications
- Public profiles and people search
- Admin moderation panel with:
   - report handling
   - post/comment/message/feedback moderation
   - role management
   - audit timeline
   - bulk moderation actions
   - moderation snapshot export (JSON/CSV)

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL

## Project Structure

- frontend: React single-page application
- backend: Express API, database schema/migration/seed scripts
- logo.png: Branding logo used by frontend

## 1. Prerequisites (on the new PC)

Install these first:

- Node.js 20+ (LTS recommended)
- npm 10+
- PostgreSQL 14+ (or compatible)
- Git (optional, if cloning via git)

Quick check commands:

```powershell
node -v
npm -v
psql --version
```

## 2. Copy Project to New PC

Use one of these:

- Copy folder directly (USB/Drive/ZIP)
- Or clone from repository

After copying, the folder should contain:

- frontend
- backend
- logo.png

## 3. Create PostgreSQL Database

Create a database named newsnest (or use another name and match it in backend .env).

Example using psql:

```sql
CREATE DATABASE newsnest;
```

## 4. Configure Environment Files

### Backend env

From backend folder, create .env from .env.example.

Expected keys:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=replace_this_secret
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=newsnest
```

Important:

- Set JWT_SECRET to a strong custom value.
- Use your actual PostgreSQL username/password.

### Frontend env

From frontend folder, create .env from .env.example:

```env
VITE_API_URL=http://localhost:4000/api
```

## 5. Install Dependencies

Run in two terminals.

Terminal 1 (backend):

```powershell
cd backend
npm install
```

Terminal 2 (frontend):

```powershell
cd frontend
npm install
```

## 6. Initialize Database

From backend folder:

```powershell
npm run check:env
npm run db:migrate
npm run db:seed
```

What these do:

- check:env: validates backend environment setup
- db:migrate: creates/updates schema
- db:seed: inserts demo/sample data

## 7. Run the Application

### Start backend

```powershell
cd backend
npm run dev
```

Backend will run at:

- http://localhost:4000
- API base: http://localhost:4000/api

### Start frontend

```powershell
cd frontend
npm run dev
```

Frontend will run at (default):

- http://localhost:5173

Open this URL in browser.

## 8. Demo Accounts

- Admin:
   - email: admin@newsnest.app
   - password: Admin@123
- User:
   - email: luna@newsnest.app
   - password: User@123

## 9. Production Build (Frontend)

To test production bundle locally:

```powershell
cd frontend
npm run build
npm run preview
```

## 10. Useful Scripts

Backend scripts:

- npm run dev
- npm run start
- npm run check:env
- npm run db:migrate
- npm run db:seed

Frontend scripts:

- npm run dev
- npm run build
- npm run preview
- npm run lint

## 11. Common Troubleshooting

### Port already in use

- Change backend PORT in backend .env
- Update frontend VITE_API_URL accordingly

### Database connection error

- Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in backend .env
- Confirm PostgreSQL service is running

### Missing tables or empty data

Run again in backend:

```powershell
npm run db:migrate
npm run db:seed
```

### Auth token problems

- Clear browser localStorage
- Login again

### Build issues after moving PCs

- Delete node_modules in frontend and backend
- Re-run npm install in both folders

## 12. API Areas (High-Level)

- /api/auth
- /api/feed
- /api/posts
- /api/social
- /api/messages
- /api/users
- /api/admin
- /api/analytics
- /api/support

## Notes

- This project uses logo.png as the site logo/favicon.
- For deployment, use strong secrets and production-grade database credentials.
