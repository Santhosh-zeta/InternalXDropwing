# InternalX Testing and Changes Report

Date: May 14, 2026  
Project: InternalXDropwing  
Scope: Local frontend/backend run verification, build checks, dependency audit, and security-focused code review.

## Executive Summary

The frontend and backend dev servers were verified locally:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/api/health`

The frontend production build passes successfully after the fixes. Backend health is reachable, but database-backed features such as login, seeding, user data, projects, tasks, and dashboard API data are blocked because the local MySQL server rejected the configured root password.

## Current Blocker

### MySQL credentials/database setup

Command tested:

```powershell
cd backend
npm run seed
```

Result:

```text
Seed failed: Access denied for user 'root'@'localhost' (using password: YES)
```

Impact:

- Test accounts cannot be seeded.
- Login returns `500 Server error during login`.
- Full role-based dashboard testing cannot be completed until MySQL is configured correctly.

Docker was also checked. Docker is installed, but the Docker Desktop Linux engine was not running, so the MySQL container from `docker-compose.yml` could not start.

## Tests Performed

| Area | Test | Result | Notes |
|---|---|---:|---|
| Frontend dev server | `http://localhost:3000` | Pass | Returned HTTP `200`. |
| Backend health | `GET /api/health` | Pass | Returned `{ status: "ok", message: "InternalX API is running" }`. |
| Frontend production build | `npm run build` in `frontend` | Pass | Build completed with Next.js `16.2.6`. |
| Frontend routes | `/`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard` | Pass | All returned HTTP `200`. |
| Backend seed | `npm run seed` in `backend` | Blocked | MySQL credentials rejected. |
| Login API | `POST /api/auth/login` with test account | Blocked | Returned HTTP `500` because DB is unavailable with current credentials. |
| Frontend lint | `npm run lint` in `frontend` | Fail | 164 problems remain: 105 errors and 59 warnings. |
| Backend dependency audit | `npm audit --audit-level=moderate` | Pass | 0 vulnerabilities after dependency update. |
| Frontend dependency audit | `npm audit --audit-level=moderate` | Partial | High Next.js advisory fixed; 2 moderate PostCSS advisories remain inside Next.js nested dependency. |

## Security Tests Performed

| Security Area | Test | Result | Evidence |
|---|---|---:|---|
| Protected route without token | `GET /api/users` | Pass | HTTP `401`, message `Authentication required`. |
| Invalid JWT rejection | `GET /api/users` with invalid bearer token | Pass | HTTP `401`, message `Invalid or expired token`. |
| Protected documents route | `GET /api/documents` without token | Pass | HTTP `401`, message `Authentication required`. |
| Database admin route without token | `GET /api/database/tables` | Pass | HTTP `401`, message `Authentication required`. |
| Role-based rejection | `GET /api/database/tables` with valid low-level local test JWT | Pass | HTTP `403`, message `Insufficient access level`. |
| Missing API route | `GET /api/not-a-real-route` | Pass | HTTP `404`, message `Route not found`. |
| Helmet security headers | `GET /api/health` | Pass | CSP, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and referrer policy present. |
| CORS trusted origin | `OPTIONS /api/health` from `http://localhost:3000` | Pass | HTTP `204`, allows localhost frontend and credentials. |
| CORS untrusted origin | `OPTIONS /api/health` from `http://evil.test` | Pass with note | Response allow-origin is still `http://localhost:3000`, so browsers should reject `evil.test`. |
| Auth rate limiting | Static code review | Pass with note | Auth routes use `express-rate-limit`, 10 requests per 15 minutes. Not hammer-tested to avoid locking local testing. |

## Security Code Review Notes

### Positive findings

- `helmet()` is enabled globally in `backend/src/server.js`.
- CORS is restricted to `FRONTEND_URL` or `http://localhost:3000`.
- Auth routes have rate limiting in `backend/src/routes/auth.routes.js`.
- JWT verification is centralized in `backend/src/middleware/auth.middleware.js`.
- Protected backend routes reject missing and invalid tokens correctly.
- Role checks use numeric access levels, where lower numbers have higher privilege.
- Passwords are hashed with bcrypt.
- Password reset tokens are hashed before being stored.
- Forgot password response avoids email enumeration.
- Most SQL queries use parameter binding.
- `.env` is ignored by `.gitignore`.

### Risks and items to fix later

1. Frontend stores JWT in `localStorage`.

   This works, but it increases impact if any XSS bug appears. The backend already sets an HTTP-only cookie, so the frontend could eventually avoid storing the token in `localStorage`.

2. Upload routes do not validate file MIME/type allowlists.

   Documents have a 50 MB size limit and avatars have a 5 MB size limit, but the current multer config accepts file extensions without checking allowed MIME types.

3. `/uploads` is publicly served.

   Files under backend uploads are served statically. This may be fine for public assets, but sensitive documents should use authenticated download routes.

4. Database route allows raw SQL for Level 1.

   `POST /api/database/query` can execute arbitrary SQL for L1 users. This is powerful and risky. It should be kept out of production or heavily audited.

5. OTP values are stored directly.

   OTP expiry is short, but for stronger security the OTP should be hashed before storing in the database.

6. Frontend lint is not clean.

   `npm run lint` reports 105 errors and 59 warnings. These include `any` usage, hook dependency issues, and React lint rules.

7. Frontend dependency audit still has moderate advisories.

   Next.js was upgraded from `16.2.4` to `16.2.6`, which removed the high advisory. npm still reports moderate PostCSS advisories from Next.js nested dependency. npm suggests `npm audit fix --force`, but that recommendation is unsafe because it tries to install a breaking Next.js version path.

8. Full login and dashboard testing is blocked until MySQL is fixed.

   The app cannot complete end-to-end user testing until the database can be seeded.

## Changes Made

### Backend

- Updated `backend/package.json`:
  - `express-rate-limit` upgraded to `^8.5.2`.
- Updated `backend/package-lock.json`.
- Created local `backend/.env` for development database/API settings.
  - This file is ignored by git because `.env` is already listed in `.gitignore`.

### Frontend dependency/security updates

- Updated `frontend/package.json`:
  - `next` upgraded from `16.2.4` to `^16.2.6`.
  - `eslint-config-next` upgraded from `16.2.4` to `^16.2.6`.
- Updated `frontend/package-lock.json`.

### Frontend build fixes

- Updated `frontend/next.config.ts`:
  - Added Turbopack root config so Next.js does not incorrectly infer `C:\Users\Sumit` as the workspace root.

- Updated Recharts tooltip formatter typing:
  - `frontend/src/app/dashboard/BudgetView.tsx`
  - `frontend/src/app/dashboard/DepartmentKPIsView.tsx`
  - `frontend/src/app/dashboard/OverviewView.tsx`
  - `frontend/src/app/dashboard/ReportsView.tsx`

- Updated `frontend/src/app/dashboard/ChatView.tsx`:
  - Removed stale `currentUser.name` fallback because the shared `User` type uses `fullName`.

- Updated `frontend/src/app/dashboard/UserManagementView.tsx`:
  - Added missing `createUser` import.

- Updated `frontend/src/lib/constants.ts`:
  - Added optional `phone?: string` to the shared `User` interface because settings uses `currentUser.phone`.

- Updated `frontend/src/app/page.tsx` and `frontend/src/app/register/page.tsx`:
  - Google sign-in buttons now render only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured.
  - This prevents build/prerender failure when Google OAuth is not configured locally.

### Local run helpers

- Added `run-backend-dev.ps1`.
- Added `run-frontend-dev.ps1`.

These scripts make it easier to run the project from VS Code terminals.

## Commands Used

Install and dependency checks:

```powershell
cd backend
npm install
npm audit --audit-level=moderate
npm install express-rate-limit@latest

cd ../frontend
npm install
npm run build
npm run lint
npm audit --audit-level=moderate
npm install next@16.2.6
npm install eslint-config-next@16.2.6
```

Server checks:

```powershell
Invoke-WebRequest http://localhost:5000/api/health
Invoke-WebRequest http://localhost:3000
```

Security endpoint checks:

```powershell
Invoke-WebRequest http://localhost:5000/api/users
Invoke-WebRequest http://localhost:5000/api/users -Headers @{ Authorization = "Bearer invalid.token.value" }
Invoke-WebRequest http://localhost:5000/api/documents
Invoke-WebRequest http://localhost:5000/api/database/tables
Invoke-WebRequest http://localhost:5000/api/not-a-real-route
```

Database setup check:

```powershell
cd backend
npm run seed
```

## How to Run Locally

Open two VS Code terminals from the project root:

```powershell
cd "C:\Users\Sumit\OneDrive\ドキュメント\IntershipProjects\InternalX\InternalXDropwing"
```

Terminal 1:

```powershell
.\run-backend-dev.ps1
```

Terminal 2:

```powershell
.\run-frontend-dev.ps1
```

Then open:

```text
http://localhost:3000
```

## Recommended Next Steps

1. Fix local MySQL credentials or start Docker Desktop and use the included MySQL container.
2. Run `npm run seed` successfully after the database is available.
3. Re-test login and role-specific dashboard flows with seeded test accounts.
4. Clean up the existing frontend lint errors in a separate follow-up task.
5. Monitor the remaining moderate PostCSS audit warning from Next.js nested dependency.
6. Consider adding MIME/type validation to uploads if documents can contain sensitive files.
7. Consider replacing frontend `localStorage` token usage with the existing HTTP-only cookie session.
