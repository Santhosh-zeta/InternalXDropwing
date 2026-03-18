# Dropwing Groups — Internal Team Portal

A full-stack internal company portal for **Dropwing Groups** and its four subsidiaries.

## Tech Stack
- **Frontend**: React 18 + Vite, React Router v6, Axios
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL + Auth)

## Project Structure
```
InternalXDropwing/
├── frontend/         # React app (port 5173)
├── backend/          # Express API (port 3001)
└── supabase_schema.sql  # DB migration script
```

## Setup Instructions

### 1. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema from the Supabase SQL editor OR via CLI:
   ```bash
   psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f supabase_schema.sql
   ```
3. Copy your **Project URL**, **anon key**, and **service_role key**

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001
```

### 3. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Run Development Servers
```bash
# Terminal 1 – Backend
cd backend && npm run dev

# Terminal 2 – Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001

### 5. Create the First Admin User (Managing Director)
In your Supabase dashboard → Auth → Users → Invite:
- Create email/password for Santhosh V
- Then in the SQL editor, insert their profile:
```sql
INSERT INTO profiles (id, full_name, role) 
VALUES ('<user-uuid>', 'Santhosh V', 'managing_director');
```

## User Roles
| Role | Access |
|------|--------|
| `managing_director` | Full access — all companies, users, data |
| `ceo` | Company-scoped — manage own company |
| `manager` | Team-scoped — manage own team |
| `intern` | View own tasks, team, announcements |
| `client` | View assigned projects only |
