#!/bin/bash

start_backend() {
    echo "Starting Flask backend..."
    cd backend || exit
    
    if [ ! -d "venv" ]; then
        echo "Virtual environment missing. Initializing and installing dependencies..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    
    python app.py &
    BACKEND_PID=$!
    cd ..
}
start_frontend() {
    echo "Starting React frontend..."
    cd frontend || exit
    npm run dev &
    FRONTEND_PID=$!
    cd ..
}

# Range of modification: Input parameter evaluation
MODE=$1

if [ -z "$MODE" ]; then
    read -p "Enter execution mode [ (f)rontend / (b)ackend / (c)ombined ]: " USER_INPUT
    case "$USER_INPUT" in
        f|F) MODE="frontend" ;;
        b|B) MODE="backend" ;;
        c|C) MODE="combined" ;;
        *) echo "Invalid selection. Exiting."; exit 1 ;;
    esac
fi

# Range of modification: Execution routing and process management
case "$MODE" in
    frontend)
        start_frontend
        trap "kill $FRONTEND_PID 2>/dev/null; exit" INT TERM
        wait $FRONTEND_PID
        ;;
    backend)
        start_backend
        trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM
        wait $BACKEND_PID
        ;;
    combined)
        start_backend
        start_frontend
        trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
        wait
        ;;
    *)
        echo "Usage: ./run.sh [frontend|backend|combined]"
        exit 1
        ;;
esac