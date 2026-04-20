# ScholarGraph

ScholarGraph maps academic papers and their citations as an interactive knowledge graph. We thought of it since it was tough to visualize the citation network of papers and understand how they are connected. Moreover tools that exist for graph visualization are often behind a paywall or free tier usage limit.
---

## Features

- Search papers and instantly visualize their citation network
- Interactive node link graph with dynamic exploration
- Redis-backed caching for fast repeated queries
- Python backend serving structured graph data
- Type safe TypeScript frontend for graph interaction

---

## Prerequisites

- Python 3.8+
- Node.js 19+ and npm
- Redis

Install Redis before running the application:

**macOS**
```bash
brew install redis
```

**Ubuntu / Debian**
```bash
sudo apt update && sudo apt install redis
```

**Windows**
```bash
winget install Redis.Redis
```

---

## Getting Started

```bash
git clone https://github.com/ManjotSingh08x/ScholarGraph.git
cd ScholarGraph
chmod +x run.sh
./run.sh
```

Select a mode when prompted:

```
1) Backend
2) Frontend
3) Redis client
4) Combined (all)
```

Or pass it directly:

```bash
./run.sh combined
```

On first run, the script automatically creates a Python virtual environment and installs all dependencies.

---

## Project Structure

```
ScholarGraph/
├── backend/               # Python API server
├── frontend/              # TypeScript frontend
├── sample_graph_data.json # Sample dataset for local testing
└── run.sh                 # Unified startup script
```

---

## Manual Setup

**Backend**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Tech Stack

| Layer    | Technology               |
|----------|--------------------------|
| Frontend | TypeScript, CSS          |
| Backend  | Python                   |
| Caching  | Redis                    |
| Runtime  | Node.js, Shell scripting |


--
TEAM 14 
Adityavardhan Singh
Mayank Rana
Manjot Singh
Abhinav Shresth
Anjan Singla