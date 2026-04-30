<div align="center">

# ✦ InternalX
### Enterprise Command Center — Dropwing Groups

**A full-stack, multi-tenant enterprise management portal supporting 9 access levels across 4 ventures.**

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=flat-square&logo=nodedotjs)
![MySQL](https://img.shields.io/badge/MySQL-MariaDB-blue?style=flat-square&logo=mysql)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-white?style=flat-square&logo=socketdotio)
![License](https://img.shields.io/badge/License-ISC-yellow?style=flat-square)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Ventures](#-ventures)
- [Access Level System](#-access-level-system)
- [Design Aesthetics](#-design-aesthetics)
- [Feature Status](#-feature-status)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
- [Test Accounts](#-test-accounts)
- [Tech Stack](#-tech-stack)

---

## 🌐 Overview

**InternalX** is the unified internal command center for **Dropwing Groups** — a holding entity managing four distinct ventures. It provides role-based access control across **9 access levels** (Super Admin → Client), enabling each stakeholder to see exactly the data and actions relevant to their role and venture.

### Core Capabilities

| Area | What It Does |
|------|-------------|
| **Multi-Tenant Auth** | JWT-based login with per-venture role isolation |
| **Real-Time Chat** | WebSocket (Socket.IO) team messaging with channels + DMs |
| **Task & Project Management** | Full CRUD with status tracking, priorities, deadlines |
| **Document Vault** | Secure file storage with role-gated access |
| **Timesheets** | Multi-venture payroll and timesheet approval workflows |
| **Invoices** | Invoice creation, status tracking, and client-visible downloads |
| **Analytics & Reports** | Cross-venture KPIs, productivity charts, export tools |
| **Access Control** | Visual permission matrix for L1 to manage all roles |
| **Budget & Financials** | Per-venture budget allocation, expense tracking, burn rates |
| **Department KPIs** | OKR tracking, headcount, team velocity for CXO/MD views |
| **Client Portal** | Read-only branded portal for L9 clients with project timelines |
| **Learning Hub** | Intern onboarding checklists, resource library, manager feedback |
| **Notifications** | In-app notification bell with real-time alerts |
| **Audit Logs** | Full activity trail for compliance and security (L1 only) |
| **User Management** | Employee profiles, role assignment, deactivation |
| **Settings** | Profile management, password change, preferences |
| **Email Engine** | Automated task-assignment emails via Hostinger SMTP |

---

## 🏢 Ventures

InternalX manages **4 ventures** within Dropwing Groups, each with its own branding color and team:

| Venture | Slug | Color | Description |
|---------|------|-------|-------------|
| **Dropwing Design Studio** | `dropwing` | `#8B5CF6` (Purple) | Creative design studio — brand identity & UI/UX |
| **SerphoSoft** | `serphosoft` | `#06B6D4` (Cyan) | Software development & SaaS solutions |
| **PerSyniX** | `persynix` | `#F59E0B` (Amber) | AI & ML solutions platform |
| **Grovia** | `grovia` | `#10B981` (Green) | Marketing and growth solutions |

> Super Admin (L1) and Managing Director (L2) accounts have **global access** across all ventures. L3–L9 users are scoped to their assigned venture.

---

## 🎚️ Access Level System

InternalX uses a **9-tier access level hierarchy**:

| Level | Role | Venture Scope | Key Capabilities |
|-------|------|--------------|-----------------|
| **L1** | Super Admin | Global (All) | Full system access, access control, audit logs, database |
| **L2** | Managing Director | Global (All) | Strategic oversight, financials, HR overview, reports |
| **L3** | Admin | Single Venture | Venture admin panel, user management, all venture data |
| **L4** | CXO | Single Venture | C-Suite dashboard, department KPIs, budget, team management |
| **L5** | Manager | Single Venture | Team dashboard, projects, tasks, reports |
| **L6** | Executive Staff | Single Venture | Projects, tasks, documents, timesheets |
| **L7** | Staff | Single Venture | Personal dashboard, assigned tasks, documents, timesheets |
| **L8** | Intern | Single Venture | My tasks, learning hub, team chat |
| **L9** | Client | Single Venture | Project status, deliverables, invoices, messages (read-only) |
| **L0** | Superuser | System Root | Maintenance only (Reserved) |

---

## ✨ Design Aesthetics

InternalX follows a **Premium Dark Design System** inspired by modern high-end enterprise platforms:

- **Violet Accent System**: Unified brand identity using `#8B5CF6` (Violet) as the primary interaction color.
- **Glassmorphism**: Sophisticated backdrop blurs and semi-transparent layers for a deep, layered interface.
- **Micro-Animations**: Smooth transitions, hover scaling, and pulse effects using Framer Motion.
- **Responsive Charts**: Recharts-powered analytics with automated dimension handling and zero-latency rendering.
- **Venture Theming**: UI components subtly shift accents (Cyan, Amber, Emerald) based on the user's active venture context.

---

## ✅ Feature Status

### Core Views (All Implemented)

| View | File | Status | Visible To |
|------|------|--------|-----------|
| Overview / Dashboard | `OverviewView.tsx` | ✅ Live | L1–L8 |
| Tasks | `TasksView.tsx` | ✅ Live | L1–L9 |
| Projects | `ProjectsView.tsx` | ✅ Live | L1–L9 |
| Team Chat | `ChatView.tsx` | ✅ Live (WebSocket) | L1–L9 |
| User Management | `UserManagementView.tsx` | ✅ Live | L1, L3 |
| Documents (Vault) | `DocumentsView.tsx` | ✅ Live | L1–L9 |
| Timesheets | `TimesheetsView.tsx` | ✅ Live | L6–L7 |
| Invoices | `InvoicesView.tsx` | ✅ Live | L1–L3, L9 |
| Settings | `SettingsView.tsx` | ✅ Live | L1–L9 |
| Audit Logs | `AuditLogsView.tsx` | ✅ Live | L1 only |
| Reports & Analytics | `ReportsView.tsx` | ✅ Live | L1–L5 |
| Access Control | `AccessControlView.tsx` | ✅ Live | L1 only |
| Budget / Financials | `BudgetView.tsx` | ✅ Live | L2, L4 |
| Strategy | `StrategyView.tsx` | ✅ Live | L1, L2 |
| Department KPIs | `DepartmentKPIsView.tsx` | ✅ Live | L4 (also HR Overview, Team Mgmt) |
| Client Portal | `ClientPortalView.tsx` | ✅ Live | L9 |
| Database | `DatabaseView.tsx` | ✅ Live | L1 |
| Learning Hub | `LearningHubView.tsx` | ✅ Live | L1–L8 |
| Notification Bell | `NotificationBell.tsx` | ✅ Live | L1–L9 |

### Menu Items Status

| Menu Item | Who Sees It | Status |
|-----------|------------|--------|
| System Overview / Dashboard | L1–L8 | ✅ Live |
| Projects / My Projects | L1–L9 | ✅ Live |
| Tasks / My Tasks | L1–L9 | ✅ Live |
| Documents | L1–L9 | ✅ Live |
| Team Chat / Messages | L1–L9 | ✅ Live (WebSocket) |
| User Management / Team Members | L1, L3, L5 | ✅ Live |
| Timesheets | L6–L7 | ✅ Live |
| Invoices | L1–L3, L9 | ✅ Live |
| Settings | L1–L9 | ✅ Live |
| Audit Logs | L1 | ✅ Live |
| Reports | L1–L5 | ✅ Live |
| Access Control | L1 | ✅ Live |
| Budget / Financials | L2, L4 | ✅ Live |
| Department KPIs | L4 | ✅ Live |
| HR Overview | L2 | ✅ Live (uses DepartmentKPIsView) |
| Team Management | L4 | ✅ Live (uses DepartmentKPIsView) |
| Client Portal (Deliverables) | L9 | ✅ Live |
| Notification Bell | All | ✅ Live |
| **Strategy** | L2 | ✅ Live |
| **Database** | L1 | ✅ Live |
| **Learning Hub** | L8 | ✅ Live |

---

## 🏗️ Architecture

```
InternalXDropwing/
├── frontend/          # Next.js 15 App Router (Port 3000)
└── backend/           # Express.js API Server (Port 5000)
```

### Frontend → Backend Communication

```
Browser ──HTTPS──> Next.js Frontend (3000)
                        │
                        ├── REST API calls ──> Express Backend (5000)
                        │                         │
                        └── WebSocket ──> Socket.IO Server (5000)
                                                  │
                                             MySQL Database
```

### Auth Flow

```
Login Form ──POST /api/auth/login──> Validate credentials
                                          │
                                    Issue JWT (8h expiry)
                                          │
                               Store in localStorage + Cookie
                                          │
                        All subsequent requests: Bearer <token>
```

---

## 📁 Project Structure

```
InternalXDropwing/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # MySQL2 connection pool
│   │   │   ├── schema.sql           # Full DB schema + seed data
│   │   │   └── create_db.sql        # Database creation script
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   # Login, logout, /me endpoint
│   │   │   ├── task.controller.js   # Task CRUD + email triggers
│   │   │   ├── invoice.controller.js
│   │   │   ├── document.controller.js
│   │   │   └── timesheet.controller.js
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.middleware.js   # JWT verify, req.user injection
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js       # POST /login, /logout, GET /me
│   │   │   ├── user.routes.js       # Full user CRUD + role mgmt
│   │   │   ├── task.routes.js       # Task CRUD
│   │   │   ├── project.routes.js    # Project CRUD + milestones
│   │   │   ├── chat.routes.js       # Message persistence
│   │   │   ├── analytics.routes.js  # Cross-venture KPI aggregations
│   │   │   ├── audit.routes.js      # Audit trail (L1 only)
│   │   │   ├── document.routes.js   # File upload/download (Multer)
│   │   │   ├── timesheet.routes.js  # Timesheet submit/approve
│   │   │   ├── invoice.routes.js    # Invoice CRUD
│   │   │   ├── access_control.routes.js  # Permission matrix R/W
│   │   │   ├── notifications.routes.js   # In-app notifications
│   │   │   ├── budget.routes.js     # Budget + expenses
│   │   │   ├── kpis.routes.js       # Department KPIs + OKRs
│   │   │   ├── client_portal.routes.js   # L9 client-scoped endpoints
│   │   │   └── learning.routes.js   # Intern checklist/resources/feedback
│   │   │
│   │   ├── services/
│   │   │   ├── email.service.js     # Nodemailer + Hostinger SMTP
│   │   │   └── audit.service.js     # Audit log helper
│   │   │
│   │   └── server.js                # Express app + Socket.IO bootstrap
│   │
│   ├── uploads/                     # Multer file storage directory
│   ├── seed.js                      # DB seeder (36 test accounts)
│   ├── migrate-learning.js          # Learning Hub table migration
│   ├── migrate-notifications.js     # Notifications table migration
│   ├── alter*.js                    # Various ALTER TABLE migration scripts
│   ├── package.json
│   └── .env                         # Environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Login page (multi-venture selector)
│   │   │   ├── layout.tsx           # Root layout + Toaster
│   │   │   ├── globals.css          # Design system tokens + animations
│   │   │   └── dashboard/
│   │   │       ├── page.tsx         # Dashboard shell + sidebar + routing
│   │   │       ├── OverviewView.tsx
│   │   │       ├── TasksView.tsx
│   │   │       ├── ProjectsView.tsx
│   │   │       ├── ChatView.tsx
│   │   │       ├── UserManagementView.tsx
│   │   │       ├── DocumentsView.tsx
│   │   │       ├── TimesheetsView.tsx
│   │   │       ├── InvoicesView.tsx
│   │   │       ├── SettingsView.tsx
│   │   │       ├── AuditLogsView.tsx
│   │   │       ├── ReportsView.tsx
│   │   │       ├── AccessControlView.tsx
│   │   │       ├── BudgetView.tsx
│   │   │       ├── DepartmentKPIsView.tsx
│   │   │       ├── ClientPortalView.tsx
│   │   │       └── NotificationBell.tsx
│   │   │
│   │   └── lib/
│   │       ├── api.ts               # Axios client + all API call functions
│   │       └── constants.ts         # TEST_ACCOUNTS, VENTURES, User types
│   │
│   └── package.json
│
├── generated_data.txt               # Reference: 36 test account definitions
├── README.md
└── .gitignore
```

---

## 🗄️ Database Schema

**Database:** `u247884947_InternalDG` (MySQL/MariaDB)

### Core Tables

| Table | Purpose |
|-------|---------|
| `ventures` | The 4 venture entities (name, slug, color, description) |
| `access_levels` | 9 role definitions with JSON permissions field |
| `users` | All employees and clients (36 test accounts + real users) |
| `sessions` | JWT session tracking (for audit + kill-session) |
| `tasks` | Task records with assignee, priority, status, due date |
| `projects` | Project records with milestones, status, venture scope |
| `messages` | Chat messages (venture channels + DMs) |
| `documents` | File metadata (stored in `/uploads`) |
| `timesheets` | Timesheet entries + approval workflow |
| `invoices` | Invoice records with status |
| `notifications` | In-app notification queue per user |

### Learning Hub Tables

| Table | Purpose |
|-------|---------|
| `learning_checklist_items` | Onboarding tasks defined by managers |
| `learning_intern_progress` | Per-intern completion tracking (user × item) |
| `learning_resources` | Resource library links/docs/videos |
| `learning_feedback` | Manager notes and ratings for interns |

### Key Relationships

```
ventures (1) ──── (N) users
ventures (1) ──── (N) tasks
ventures (1) ──── (N) projects
users    (1) ──── (N) tasks [assigned_to + assigned_by]
users    (1) ──── (N) notifications
users    (1) ──── (N) sessions
```

---

## 🔌 API Reference

**Base URL:** `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <JWT_TOKEN>`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login with email + password → returns JWT + user object |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/auth/me` | Get current authenticated user |

### Users

| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/users` | L1–L5 |
| `GET` | `/users/:id` | L1–L5 |
| `PUT` | `/users/:id` | L1, L3 |
| `DELETE` | `/users/:id` | L1 |
| `PATCH` | `/users/:id/toggle-active` | L1, L3 |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks` | Venture-scoped task list |
| `POST` | `/tasks` | Create task (triggers email notification) |
| `PUT` | `/tasks/:id` | Update task |
| `DELETE` | `/tasks/:id` | Delete task |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects` | Venture-scoped project list |
| `POST` | `/projects` | Create project |
| `PUT` | `/projects/:id` | Update project |
| `DELETE` | `/projects/:id` | Delete project |

### Chat (also WebSocket)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/chat/messages` | Fetch channel or DM history |
| `POST` | `/chat/messages` | Persist new message |

**WebSocket Events (Socket.IO):**
- `join_channel(channelId)` — Join a venture or DM channel
- `send_message(data)` — Broadcast message to channel
- `receive_message(data)` — Listen for incoming messages

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics` | Cross-venture aggregated KPIs |

### Budget / Financials

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/budget` | Venture budgets overview |
| `POST` | `/budget` | Create/update budget allocation |
| `GET` | `/budget/expenses` | Expense log |
| `POST` | `/budget/expenses` | Log new expense |

### Department KPIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/kpis` | Department KPI data |
| `POST` | `/kpis` | Create KPI target |
| `PUT` | `/kpis/:id` | Update KPI progress |

### Learning Hub

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/learning/checklist` | Get checklist items (role-aware) |
| `POST` | `/learning/checklist` | Manager creates checklist item |
| `DELETE` | `/learning/checklist/:id` | Manager deletes checklist item |
| `PATCH` | `/learning/progress/:id` | Intern marks item complete |
| `GET` | `/learning/progress` | Manager views intern progress |
| `GET` | `/learning/resources` | Resource library |
| `POST` | `/learning/resources` | Manager adds resource |
| `DELETE` | `/learning/resources/:id` | Manager removes resource |
| `GET` | `/learning/feedback` | Feedback (role-filtered) |
| `POST` | `/learning/feedback` | Manager adds intern feedback |

### Other Endpoints

| Prefix | Description |
|--------|-------------|
| `/notifications` | In-app alerts (GET, PATCH read, DELETE clear) |
| `/access-control` | Permission matrix (L1: GET all, PUT update) |
| `/audit` | Audit logs (L1 only: GET) |
| `/documents` | File upload (Multer) + download |
| `/timesheets` | Timesheet submit + approve/reject |
| `/invoices` | Invoice CRUD |
| `/client-portal` | L9 client-scoped project/invoice views |
| `/health` | `GET /api/health` — API liveness check |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and **npm**
- **MySQL** / **MariaDB** running locally
- A database named `u247884947_InternalDG` (or update `.env`)

### 1. Clone & Install

```bash
git clone <repo-url>
cd InternalXDropwing

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u247884947_InternalDG
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Email (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=internal@dropwinggroups.com
SMTP_PASS=your_smtp_password
```

### 3. Initialize Database

```bash
# Create the database (if it doesn't exist)
mysql -u root -p < backend/src/config/create_db.sql

# Run the full schema + seed (36 test users)
cd backend
node seed.js
```

### 4. Run Learning Hub Migration (if needed)

```bash
node migrate-learning.js
node migrate-notifications.js
```

### 5. Start the Servers

```bash
# Terminal 1 — Backend API (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 👥 Test Accounts

All accounts use password: **`Test@1234`**

> Use the **Quick Access Grid** on the login page to instant-load credentials. You can filter by venture using the colored dots above the grid.

### Global Accounts (All Ventures)

| Role | Email | Level |
|------|-------|-------|
| Super Admin | `sa@dropwinggroups.com` | L1 |
| Managing Director | `md@dropwinggroups.com` | L2 |

### Per-Venture Accounts

Each venture (Dropwing, SerphoSoft, PerSyniX, Grovia) has one account per role level:

| Role | Dropwing | SerphoSoft | PerSyniX | Grovia |
|------|----------|-----------|---------|--------|
| **L1** Super Admin | `sa@dropwing.in` | `sa@serphosoft.com` | `sa@persynix.com` | `sa@grovia.in` |
| **L2** MD | `md@dropwing.in` | `md@serphosoft.com` | `md@persynix.com` | `md@grovia.in` |
| **L3** Admin | `ad@dropwing.in` | `ad@serphosoft.com` | `ad@persynix.com` | `ad@grovia.in` |
| **L4** CXO | `cx@dropwing.in` | `cx@serphosoft.com` | `cx@persynix.com` | `cx@grovia.in` |
| **L5** Manager | `mg@dropwing.in` | `mg@serphosoft.com` | `mg@persynix.com` | `mg@grovia.in` |
| **L6** Exec Staff | `es@dropwing.in` | `es@serphosoft.com` | `es@persynix.com` | `es@grovia.in` |
| **L7** Staff | `st@dropwing.in` | `st@serphosoft.com` | `st@persynix.com` | `st@grovia.in` |
| **L8** Intern | `in@dropwing.in` | `in@serphosoft.com` | `in@persynix.com` | `in@grovia.in` |
| **L9** Client | `cl@dropwing.in` | `cl@serphosoft.com` | `cl@persynix.com` | `cl@grovia.in` |

> **Total:** 2 global + 36 per-venture = **38 test accounts**

### Employee ID Format

```
[VENTURE_CODE]-[ROLE_CODE]-[SEQUENCE]
  DW = Dropwing    SA = Super Admin    001 ...
  SS = SerphoSoft  MD = Managing Dir
  PX = PerSyniX    AD = Admin
  GV = Grovia      CX = CXO
                   MG = Manager
                   ES = Exec Staff
                   ST = Staff
                   IN = Intern
                   CL = Client
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15 (App Router) | React framework + SSR |
| **TypeScript** | 5 | Type safety |
| **Axios** | Latest | HTTP client |
| **Socket.IO Client** | 4 | Real-time chat |
| **React Hot Toast** | Latest | Notification toasts |
| **Lucide React** | Latest | Icon library |
| **Vanilla CSS** | — | Custom design system (glassmorphism) |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express.js** | 4 | HTTP framework |
| **MySQL2** | 3 | Database driver (Promise API) |
| **Socket.IO** | 4 | WebSocket server |
| **bcryptjs** | 2 | Password hashing |
| **jsonwebtoken** | 9 | JWT auth |
| **Multer** | 2 | File uploads |
| **Nodemailer** | 8 | Email notifications |
| **Helmet** | 8 | HTTP security headers |
| **Morgan** | 1 | Request logging |
| **Nodemon** | 3 | Dev hot-reload |

### Infrastructure
| Component | Details |
|-----------|---------|
| **Database** | MySQL / MariaDB (local or hosted) |
| **File Storage** | Local filesystem (`/backend/uploads`) |
| **Email** | Hostinger SMTP (`smtp.hostinger.com:465`) |
| **Auth** | JWT Bearer tokens (8h expiry) + HTTP-only cookies |

---

## 🎨 Design System

InternalX uses a custom glassmorphism design system with:

- **Dark theme** (#030303 background, glass panels)
- **Venture-aware colors** — UI accent shifts to the venture's primary color per user
- **Mouse spotlight** — interactive radial gradient that follows cursor on login
- **Micro-animations** — fade-in-up, pulse-glow, animate-spin-slow
- **Gradient text** — purple → indigo → cyan for brand elements
- **Level color coding** — Each access level gets a unique accent color

---

## 🔒 Security

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT tokens with 8-hour expiry
- **Helmet.js** sets secure HTTP headers
- All API routes validate JWT via `authenticate` middleware
- Role-based authorization enforced at route and query level (venture scoping)
- Files served from `/uploads` are static; document access gated by auth middleware

---

## 📬 Email Notifications

When a task is assigned, InternalX automatically emails the assignee via Hostinger SMTP:

- **Trigger:** `POST /api/tasks` (task creation)
- **Template:** Branded HTML email with task details, priority, and due date
- **Service:** `backend/src/services/email.service.js`

---

## 🚧 What's Next

| Feature | Status | Priority |
|---------|--------|----------|
| Mobile Responsive Sidebar | In Progress | 🟡 Medium |
| 2FA / Security Settings | Not started | 🟠 Low |
| Avatar Upload | Not started | 🟠 Low |
| PWA / Offline Mode | Not started | 🟢 Low |

---

<div align="center">

Built with ❤️ for **Dropwing Groups** — *InternalX v1.0*

</div>
