#!/bin/bash

echo "========================================"
echo "   STARTING AEGIS-ZONE FULL STACK ENCLAVE "
echo "========================================"

# Determine directories
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$BASE_DIR/aegis-backend"
FRONTEND_DIR="$BASE_DIR/aegis-frontend"

# 1. Start Backend
echo "[1/2] Initializing Cryptographic Backend..."
cd $BACKEND_DIR

# Check if venv exists, create if not
if [ ! -d "venv" ]; then
    echo "      Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Kill any existing uvicorn process to free up port 8000
pkill -f uvicorn

# Start backend in background
uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

echo "      Backend started (PID: $BACKEND_PID)."
echo "      Waiting 3 seconds for it to bind ports..."
sleep 3

# 2. Start Frontend
echo "[2/2] Initializing Next.js Dashboard..."
cd $FRONTEND_DIR

# Check for node_modules
if [ ! -d "node_modules" ]; then
    echo "      Installing Node dependencies (this may take a few minutes on a Pi)..."
    npm install
fi

# Kill any existing next dev process
pkill -f next

# Start frontend (dev mode for simplicity, binds to 0.0.0.0)
npm run dev -- -H 0.0.0.0 -p 3000 > frontend.log 2>&1 &
FRONTEND_PID=$!

# Get Pi's primary IP
PI_IP=$(hostname -I | awk '{print $1}')

echo "      Frontend started (PID: $FRONTEND_PID)."
echo ""
echo "========================================================="
echo "✅ AEGIS-ZONE IS ONLINE"
echo ""
echo "📡 Bio-Lock Node: Connect via USB."
echo "📡 WIDS Nodes: Connect via Wi-Fi Hub."
echo ""
echo "💻 Access the dashboard from any device at:"
echo "   http://$PI_IP:3000"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f $BACKEND_DIR/backend.log"
echo "   Frontend: tail -f $FRONTEND_DIR/frontend.log"
echo ""
echo "🛑 To stop the system, run:"
echo "   pkill -f uvicorn && pkill -f next"
echo "========================================================="
