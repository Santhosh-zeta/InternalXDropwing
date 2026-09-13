#!/bin/bash

# ============================================
# InternalX Deployment Script with Cloudflare Tunnel
# ============================================
# This script starts both frontend and backend, then establishes a Cloudflare Tunnel

set -e

# All paths below are relative to the repository root, so run from there
# regardless of where the script was invoked from.
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=5001
FRONTEND_PORT=3001
TUNNEL_NAME="internalx-tunnel"
DOMAIN="internalx.santhoshv.xyz"

# Function to print colored output
print_status() {
    echo -e "${BLUE}→${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         InternalX Deployment with Cloudflare Tunnel            ║"
echo "║           Deploying to: https://${DOMAIN}             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if cloudflared is installed
print_status "Checking cloudflared installation..."
if ! command -v cloudflared &> /dev/null; then
    print_error "cloudflared is not installed!"
    echo "Install it with:"
    echo "  macOS:  brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux:  sudo apt-get install cloudflared"
    exit 1
fi
print_success "cloudflared is installed"

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    exit 1
fi
NODE_VERSION=$(node -v)
print_success "Node.js $NODE_VERSION detected"

# Install dependencies if needed
print_status "Checking backend dependencies..."
if [ ! -d "backend/node_modules" ]; then
    print_warning "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

print_status "Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    print_warning "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

# Verify .env files exist
print_status "Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    if [ ! -f "backend/.env.production" ]; then
        print_error "backend/.env not found!"
        print_warning "Copy backend/.env.production to backend/.env and update values"
        exit 1
    else
        print_warning "Using backend/.env.production (copy to .env for production)"
    fi
fi
print_success "Backend environment configured"

if [ ! -f "frontend/.env.local" ]; then
    if [ ! -f "frontend/.env.production.local" ]; then
        print_error "frontend/.env.local not found!"
        print_warning "Copy frontend/.env.production.local to frontend/.env.local"
        exit 1
    else
        print_warning "Using frontend/.env.production.local (copy to .env.local for production)"
    fi
fi
print_success "Frontend environment configured"

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    print_success "Cleanup complete"
}

trap cleanup EXIT

# Start backend
echo ""
print_status "Starting backend server on port ${BACKEND_PORT}..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
print_success "Backend started (PID: $BACKEND_PID)"

# Start frontend
echo ""
print_status "Starting frontend server on port ${FRONTEND_PORT}..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
print_success "Frontend started (PID: $FRONTEND_PID)"

# Wait for services to start
print_status "Waiting for services to initialize..."
sleep 10

# Check if services are running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend failed to start!"
    echo "Check logs: tail -f logs/backend.log"
    exit 1
fi

if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend failed to start!"
    echo "Check logs: tail -f logs/frontend.log"
    exit 1
fi

print_success "Both services are running"

# Verify tunnel is configured
print_status "Verifying Cloudflare Tunnel configuration..."
if ! cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    print_error "Tunnel '$TUNNEL_NAME' not found!"
    print_warning "Create it with: cloudflared tunnel create $TUNNEL_NAME"
    exit 1
fi
print_success "Tunnel '$TUNNEL_NAME' exists"

# Start tunnel
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
print_success "All systems ready! Starting Cloudflare Tunnel..."
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Your application is now available at:"
echo -e "  ${GREEN}https://${DOMAIN}${NC}"
echo ""
echo "Services:"
echo -e "  Frontend:  ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  Backend:   ${BLUE}http://localhost:${BACKEND_PORT}${NC}"
echo ""
echo "Logs:"
echo -e "  Backend:   tail -f logs/backend.log"
echo -e "  Frontend:  tail -f logs/frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start tunnel
cloudflared tunnel run $TUNNEL_NAME
