# Cloudflare Tunnel Setup for InternalX

Complete guide to host InternalX (Frontend + Backend + WebSocket) using Cloudflare Tunnel.

## Overview

We'll host InternalX at **`internalx.santhoshv.xyz`** using Cloudflare Tunnel with proper routing for:
- **Frontend** (Next.js): Port 3000
- **Backend API** (Express + Socket.IO): Port 5000

---

## Prerequisites

1. **Cloudflare Account** with domain `santhoshv.xyz`
2. **Cloudflare Tunnel** installed on your machine
3. **Backend running** on `http://localhost:5000`
4. **Frontend running** on `http://localhost:3000`

---

## Architecture

```
┌─────────────────────────────────────────┐
│     Cloudflare Tunnel                   │
│     (internalx.santhoshv.xyz)          │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │                       │
        ▼                       ▼
  Frontend (3000)        Backend (5000)
  (Next.js)              (Express + Socket.IO)
        │                       │
        ├── UI Routes      ├── /api/*
        ├── Socket.IO ◄────┤── /socket.io/*
        └── Static Assets  └── /uploads/*
```

---

## Option 1: Unified Setup (Recommended)

### Best for: Single domain with path-based routing

**Advantages:**
- Single domain (easier to remember)
- Path-based routing (`/api`, `/socket.io`)
- Better for CORS configuration
- Simpler DNS setup

### Service URLs for Frontend & Backend:

#### Frontend Environment Variables (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=https://internalx.santhoshv.xyz/api
NEXT_PUBLIC_SOCKET_URL=https://internalx.santhoshv.xyz
```

#### Backend Environment Variables (`backend/.env`):
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://internalx.santhoshv.xyz
```

### Cloudflare Tunnel Configuration

**Create tunnel configuration file:** `~/.cloudflared/config.yml`

```yaml
tunnel: internalx-tunnel
credentials-file: /home/santhosh/.cloudflared/<UUID>.json

ingress:
  # Backend API and WebSocket routes
  - hostname: internalx.santhoshv.xyz
    path: ^/api/.*
    service: http://localhost:5000
    originRequest:
      httpHostHeader: localhost:5000
      
  - hostname: internalx.santhoshv.xyz
    path: ^/socket.io/.*
    service: http://localhost:5000
    originRequest:
      httpHostHeader: localhost:5000
      
  # Frontend (Next.js) - catch all
  - hostname: internalx.santhoshv.xyz
    service: http://localhost:3000
    originRequest:
      httpHostHeader: localhost:3000

  # Catch-all
  - service: http_status:404
```

### Steps to Deploy:

1. **Install Cloudflare Tunnel** (if not already installed):
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Or using apt on Debian/Ubuntu
sudo apt-get install cloudflared
```

2. **Authenticate with Cloudflare**:
```bash
cloudflared tunnel login
# This opens a browser to authenticate
```

3. **Create the tunnel**:
```bash
cloudflared tunnel create internalx-tunnel
# Note the tunnel UUID printed
```

4. **Update config file** with your UUID:
```bash
nano ~/.cloudflared/config.yml
```

5. **Test locally**:
```bash
# Terminal 1: Run backend
cd backend
npm run dev
# Should see: 🚀 InternalX Backend running on http://localhost:5000

# Terminal 2: Run frontend
cd frontend
npm run dev
# Should see: ▲ Next.js running on http://localhost:3000

# Terminal 3: Start tunnel
cloudflared tunnel run internalx-tunnel
# Should see: SUCCESS: Tunnel registered and ready to serve traffic
```

6. **Route DNS** in Cloudflare Dashboard:
- Go to Cloudflare Dashboard → Tunnels
- Select `internalx-tunnel`
- Click "Configure"
- Add public hostname:
  - **Subdomain**: `internalx`
  - **Domain**: `santhoshv.xyz`
  - **Type**: `CNAME`
  - **URL**: `http://localhost:3000` (default, will be overridden by config)

7. **Verify**:
```bash
curl https://internalx.santhoshv.xyz
curl https://internalx.santhoshv.xyz/api/health
```

---

## Option 2: Subdomain Setup (Alternative)

### Best for: Microservices architecture, API versioning

**Advantages:**
- Clear separation of concerns
- Easier to scale independently
- Better for API gateways

### Service URLs:

#### Frontend Environment Variables (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=https://api.internalx.santhoshv.xyz
NEXT_PUBLIC_SOCKET_URL=https://api.internalx.santhoshv.xyz
```

#### Backend Environment Variables (`backend/.env`):
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://internalx.santhoshv.xyz
```

### Cloudflare Tunnel Configuration

**Create two ingress rules:** `~/.cloudflared/config.yml`

```yaml
tunnel: internalx-tunnel
credentials-file: /home/santhosh/.cloudflared/<UUID>.json

ingress:
  # Frontend on main domain
  - hostname: internalx.santhoshv.xyz
    service: http://localhost:3000
    originRequest:
      httpHostHeader: localhost:3000
      
  # Backend on API subdomain
  - hostname: api.internalx.santhoshv.xyz
    service: http://localhost:5000
    originRequest:
      httpHostHeader: localhost:5000
      
  # Catch-all
  - service: http_status:404
```

### DNS Setup:
In Cloudflare Dashboard, add TWO public hostnames:

1. **Frontend**:
   - **Subdomain**: `internalx`
   - **Domain**: `santhoshv.xyz`
   
2. **Backend API**:
   - **Subdomain**: `api.internalx`
   - **Domain**: `santhoshv.xyz`

---

## Service URLs Summary

### **Option 1: Unified (Recommended) ✅**
| Service | URL |
|---------|-----|
| **Frontend** | `https://internalx.santhoshv.xyz` |
| **Backend API** | `https://internalx.santhoshv.xyz/api` |
| **WebSocket** | `wss://internalx.santhoshv.xyz/socket.io` |

### **Option 2: Subdomains**
| Service | URL |
|---------|-----|
| **Frontend** | `https://internalx.santhoshv.xyz` |
| **Backend API** | `https://api.internalx.santhoshv.xyz` |
| **WebSocket** | `wss://api.internalx.santhoshv.xyz/socket.io` |

---

## Environment Variables Quick Reference

### Backend (`backend/.env`)
```env
# Server
PORT=5000
NODE_ENV=production

# Database
DB_HOST=your_db_host
DB_PORT=3306
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=8h

# Frontend URL (for CORS & Socket.IO)
FRONTEND_URL=https://internalx.santhoshv.xyz

# Email (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=your_email@domain.com
SMTP_PASSWORD=your_smtp_password
```

### Frontend (`frontend/.env.local`)
```env
# API Endpoint
NEXT_PUBLIC_API_URL=https://internalx.santhoshv.xyz/api

# WebSocket Server
NEXT_PUBLIC_SOCKET_URL=https://internalx.santhoshv.xyz
```

---

## Running with Tunnel

### Quick Start Script

**Create `start-with-tunnel.sh`:**
```bash
#!/bin/bash

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Start tunnel
echo "⏳ Waiting 10 seconds for services to start..."
sleep 10
cloudflared tunnel run internalx-tunnel

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
```

**Make executable and run:**
```bash
chmod +x start-with-tunnel.sh
./start-with-tunnel.sh
```

---

## Troubleshooting

### WebSocket Connection Issues
If WebSocket fails to connect, add this to your frontend:

```typescript
// frontend/lib/socket.ts
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  secure: true, // HTTPS
  rejectUnauthorized: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});
```

### CORS Issues
If you see CORS errors, verify in `backend/src/server.js`:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL, // Should be https://internalx.santhoshv.xyz
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### SSL/TLS Certificate Issues
Cloudflare Tunnel automatically handles SSL certificates. If issues persist:
```bash
# Clear local credentials
rm ~/.cloudflared/*.json
cloudflared tunnel login
```

### Health Check
```bash
# Frontend
curl -v https://internalx.santhoshv.xyz

# Backend API
curl -v https://internalx.santhoshv.xyz/api/health

# Test auth endpoint
curl -X POST https://internalx.santhoshv.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## Production Deployment Checklist

- [ ] Environment variables configured in `.env` files
- [ ] Cloudflare Tunnel running and authenticated
- [ ] DNS records pointing to tunnel
- [ ] SSL/TLS certificate valid (auto-managed by Cloudflare)
- [ ] Database is accessible from production server
- [ ] SMTP credentials are correct
- [ ] FRONTEND_URL and NEXT_PUBLIC_API_URL match
- [ ] WebSocket connections working
- [ ] Rate limiting enabled on backend
- [ ] Helmet security headers active
- [ ] Audit logging enabled

---

## Monitoring

### View Tunnel Logs
```bash
cloudflared tunnel logs internalx-tunnel
```

### Monitor Backend Logs
```bash
# See all requests
tail -f backend/logs/access.log

# Check errors
grep ERROR backend/logs/error.log
```

### Performance Metrics
Once live, Cloudflare Dashboard shows:
- Traffic analytics
- Cache hit ratio
- Firewall activity
- Performance metrics

---

## Next Steps

1. **Choose Option 1 or 2** above
2. **Update environment variables** in `.env` files
3. **Install cloudflared** if needed
4. **Configure tunnel** with the appropriate config.yml
5. **Run services** and test
6. **Enable** in Cloudflare Dashboard

Questions? Check Cloudflare docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-applications/
