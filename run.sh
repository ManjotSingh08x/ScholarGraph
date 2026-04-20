#!/bin/bash

start_backend() {
    echo "Starting backend..."
    cd backend || exit

    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
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
    echo "Starting frontend..."
    cd frontend || exit

    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi

    npm run dev &
    FRONTEND_PID=$!
    cd ..
}

start_redis() {
    echo "Starting Redis client..."
    cd backend || exit
    python redis_client.py &
    REDIS_PID=$!
    cd ..
}

MODE=$1

if [ -z "$MODE" ]; then
    echo "Select mode:"
    echo "1) Backend"
    echo "2) Frontend"
    echo "3) Redis"
    echo "4) Combined (all)"
    read -p "> " USER_INPUT

    case "$USER_INPUT" in
        1) MODE="backend" ;;
        2) MODE="frontend" ;;
        3) MODE="redis" ;;
        4) MODE="combined" ;;
        *) echo "Invalid selection"; exit 1 ;;
    esac
fi

case "$MODE" in
    backend)
        start_backend
        trap "kill $BACKEND_PID; exit" INT TERM
        wait $BACKEND_PID
        ;;
    frontend)
        start_frontend
        trap "kill $FRONTEND_PID; exit" INT TERM
        wait $FRONTEND_PID
        ;;
    redis)
        start_redis
        trap "kill $REDIS_PID; exit" INT TERM
        wait $REDIS_PID
        ;;
    combined)
        start_backend
        start_frontend
        start_redis
        echo "All services started"
        trap "kill $BACKEND_PID $FRONTEND_PID $REDIS_PID 2>/dev/null; exit" INT TERM
        wait
        ;;
    *)
        echo "Usage: ./run.sh [backend|frontend|redis|combined]"
        exit 1
        ;;
esac
