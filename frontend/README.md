# AutoOps Dashboard — Frontend

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3030
```

## Modes
- LIVE MODE: connects to real backend APIs via Vite proxy
- SIMULATION MODE: auto-fallback when APIs are unreachable, or set `VITE_SIMULATION_MODE=true`

## Build for Production

```bash
npm run build
```

## Docker

```bash
docker build -t autoops/dashboard:latest .
docker run -p 3030:80 autoops/dashboard:latest
```
