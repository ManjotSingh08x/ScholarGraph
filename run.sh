#!/bin/bash

start_backend() {
    echo "🚀 Starting Flask backend on port 5001..."
    cd backend || exit
    
    if [ ! -d "venv" ]; then
        echo "📦 Virtual environment missing. Initializing..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    
    # Kill anything already on 5001 to prevent 'Address already in use'
    lsof -t -i:5001 | xargs kill -9 2>/dev/null
    
    python app.py &
    BACKEND_PID=$!
    cd ..
}

start_frontend() {
    echo "🎨 Starting React frontend..."
    cd frontend || exit
    
    # Check if node_modules exists, if not, install
    if [ ! -d "node_modules" ]; then
        echo "📦 Frontend dependencies missing. Installing..."
        npm install
    fi

    npm run dev &
    FRONTEND_PID=$!
    cd ..
}

MODE=$1

if [ -z "$MODE" ]; then
    echo "Select execution mode:"
    echo "f) Frontend only"
    echo "b) Backend only"
    echo "c) Combined (Both)"
    read -p "> " USER_INPUT
    case "$USER_INPUT" in
        f) MODE="frontend" ;;
        b) MODE="backend" ;;
        c) MODE="combined" ;;
        *) echo "❌ Invalid selection"; exit 1 ;;
    esac
fi

case "$MODE" in
    frontend)
        start_frontend
        trap "kill $FRONTEND_PID; exit" INT TERM
        wait $FRONTEND_PID
        ;;
    backend)
        start_backend
        trap "kill $BACKEND_PID; exit" INT TERM
        wait $BACKEND_PID
        ;;
    combined)
        start_backend
        start_frontend
        echo "✅ Both servers are starting..."
        echo "Frontend: http://localhost:5173"
        echo "Backend:  http://localhost:5001"
        trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopping servers...'; exit" INT TERM
        wait
        ;;
    *)
        echo "Usage: ./run.sh [frontend|backend|combined]"
        exit 1
        ;;
esac