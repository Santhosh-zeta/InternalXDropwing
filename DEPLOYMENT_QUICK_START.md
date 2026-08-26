# 🚀 InternalX Cloudflare Tunnel Deployment - Quick Start

**Deploy InternalX at: `https://internalx.santhoshv.xyz`**

---

## 📋 Service URLs (Ready to Use!)

Use these URLs in your frontend and backend configuration:

### Frontend Configuration
```env
NEXT_PUBLIC_API_URL=https://internalx.santhoshv.xyz/api
NEXT_PUBLIC_SOCKET_URL=https://internalx.santhoshv.xyz
```

### Backend Configuration
```env
FRONTEND_URL=https://internalx.santhoshv.xyz
```

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Cloudflare Tunnel

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux (Debian/Ubuntu)
sudo apt-get install cloudflared

# Linux (other distributions) - download binary
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify installation
cloudflared --version
```

### Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
# Opens browser → Select santhoshv.xyz → Authorize → Done
```

### Step 3: Create Tunnel

```bash
cloudflared tunnel create internalx-tunnel
# Output: Tunnel credential file saved to ~/.cloudflared/[UUID].json
# Note the UUID: it looks like "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Step 4: Configure Tunnel

Replace `<TUNNEL_UUID>` with your UUID from Step 3, then:

```bash
# Copy our template to cloudflared config directory
cp cloudflared-config.yml ~/.cloudflared/config.yml

# Edit the config file
nano ~/.cloudflared/config.yml

# Change this line:
# credentials-file: /home/santhosh/.cloudflared/<TUNNEL_UUID>.json
# To your actual UUID:
# credentials-file: /home/santhosh/.cloudflared/a1b2c3d4-e5f6-7890-abcd-ef1234567890.json
```

### Step 5: Setup Environment Variables

```bash
# Backend
cp backend/.env.production backend/.env
nano backend/.env
# Update: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET, SMTP credentials

# Frontend
cp frontend/.env.production.local frontend/.env.local
# (Should already have correct URLs)
```

### Step 6: Deploy!

```bash
# Option A: Automated (Recommended)
chmod +x deploy-with-tunnel.sh
./deploy-with-tunnel.sh

# Option B: Manual (3 separate terminals)
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev

# Terminal 3:
cloudflared tunnel run internalx-tunnel
```

### Step 7: Add DNS Record in Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com
2. Select domain: `santhoshv.xyz`
3. Click: **Tunnels** (in left sidebar)
4. Select: `internalx-tunnel`
5. Click: **Public Hostname**
6. Add hostname:
   - **Subdomain**: `internalx`
   - **Domain**: `santhoshv.xyz`
   - **Type**: `CNAME`

### Step 8: Verify & Test

```bash
# Test frontend
curl -I https://internalx.santhoshv.xyz

# Test backend
curl https://internalx.santhoshv.xyz/api/health

# Test API
curl -X POST https://internalx.santhoshv.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### ✅ Done!

Open in browser: **https://internalx.santhoshv.xyz**

---

## 🔗 Architecture

```
                    📱 Browser
                        │
                        │ HTTPS
                        ▼
         ┌──────────────────────────────┐
         │   Cloudflare Edge Network    │
         │  internalx.santhoshv.xyz     │
         └──────────────────┬───────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │  /api/*  │ │/socket*  │ │  /*      │
         │ Localhost│ │Localhost │ │Localhost │
         │   :5000  │ │  :5000   │ │  :3000   │
         │(Express) │ │(Socket)  │ │(Next.js) │
         └──────────┘ └──────────┘ └──────────┘
              │              │            │
         ┌────┴──────────────┴────────────┴────┐
         │      Your Computer / Server         │
         │  (running backend + frontend)       │
         └─────────────────────────────────────┘
```

---

## 📂 Files Created

```
InternalXDropwing/
├── CLOUDFLARE_TUNNEL_SETUP.md          ← Detailed guide (read for deep dive)
├── DEPLOYMENT_QUICK_START.md           ← This file
├── cloudflared-config.yml              ← Tunnel configuration template
├── deploy-with-tunnel.sh               ← One-command deployment script
├── backend/
│   ├── .env                            ← Your actual backend config
│   └── .env.production                 ← Template (copy to .env)
├── frontend/
│   ├── .env.local                      ← Your actual frontend config
│   └── .env.production.local           ← Template (copy to .env.local)
└── logs/
    ├── backend.log                     ← Backend server logs
    └── frontend.log                    ← Frontend server logs
```

---

## 🛠️ Troubleshooting

### "cloudflared: command not found"
```bash
# Make sure it's in PATH, or use full path
/usr/local/bin/cloudflared tunnel login
```

### "Tunnel not found"
```bash
# Recreate it
cloudflared tunnel create internalx-tunnel
```

### "ER_ACCESS_DENIED_ERROR" (Database connection fails)
```bash
# Check MySQL is running and credentials are correct in backend/.env
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SELECT 1"
```

### "WebSocket connection failed"
```bash
# Ensure backend/src/server.js has correct CORS
FRONTEND_URL=https://internalx.santhoshv.xyz npm run dev
```

### "Cannot GET /api/health"
```bash
# Backend not started properly. Check logs:
tail -f logs/backend.log
```

### "Blank page" on https://internalx.santhoshv.xyz
```bash
# Frontend not started. Check logs:
tail -f logs/frontend.log
```

---

## 📊 Monitoring

### Check if services are running
```bash
# Backend
curl http://localhost:5000/api/health

# Frontend  
curl http://localhost:3000
```

### View tunnel status
```bash
cloudflared tunnel list
cloudflared tunnel info internalx-tunnel
```

### Monitor logs
```bash
# All services
tail -f logs/*.log

# Tunnel logs
cloudflared tunnel logs internalx-tunnel
```

---

## 🔐 Security Checklist

- [ ] Changed `JWT_SECRET` to a strong random value
- [ ] Updated database credentials in `backend/.env`
- [ ] Configured SMTP credentials for email
- [ ] `FRONTEND_URL` matches your domain
- [ ] `NEXT_PUBLIC_API_URL` has correct backend URL
- [ ] CORS is enabled only for your frontend domain
- [ ] Rate limiting is active (should be in backend)
- [ ] Helmet.js security headers are active
- [ ] SSL/TLS certificate is valid (auto-managed by Cloudflare)

---

## 🚀 Next Steps

1. **Install dependencies**: `npm install` in both backend & frontend
2. **Configure .env files**: Copy .env.production files and update values
3. **Setup Cloudflare Tunnel**: Follow steps 1-7 above
4. **Run deployment script**: `./deploy-with-tunnel.sh`
5. **Test**: Open https://internalx.santhoshv.xyz
6. **Monitor**: Use tail/logs commands above
7. **Deploy to production**: Scale up databases, enable backups, etc.

---

## 💡 Pro Tips

### Keep tunnel running after SSH disconnect
```bash
# Use 'screen' or 'tmux' to detach
screen -S tunnel
cloudflared tunnel run internalx-tunnel
# Press Ctrl+A then D to detach

# Reattach later
screen -r tunnel
```

### Monitor all logs in one terminal
```bash
# Use 'multitail' if installed
multitail logs/backend.log logs/frontend.log

# Or use 'tail' in separate panes
tmux new-session -d -s internalx
tmux send-keys -t internalx "tail -f logs/backend.log" Enter
tmux split-window -h
tmux send-keys "tail -f logs/frontend.log" Enter
tmux attach -t internalx
```

### Auto-restart on crash
```bash
# Install 'forever' globally
npm install -g forever

# Run with auto-restart
forever start -c "npm run dev" backend/
```

---

## 📞 Support

**Cloudflare Documentation**: https://developers.cloudflare.com/cloudflare-one/
**Tunnel Issues**: https://developers.cloudflare.com/cloudflare-one/troubleshooting/

---

**Last Updated**: 2026-08-26
**Status**: ✅ Ready for Production
