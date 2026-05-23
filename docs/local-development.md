# Local Development

## Setup

Install Docker 24+, Docker Compose v2, Bash, curl, and optionally jq. From the project root:

```bash
cp .env.example .env
./scripts/start.sh
```

## Development Compose Overrides

`docker-compose.override.yml` is applied automatically by Docker Compose. It enables:

- Node API Gateway source mounts and `nodemon`
- Python User Service source mounts and Uvicorn reload
- Debug log level for the User Service

Run the stack with:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

## Debugging Services

View all logs:

```bash
./scripts/logs.sh
```

View one service:

```bash
./scripts/logs.sh api-gateway
./scripts/logs.sh user-service
./scripts/logs.sh metrics-collector
```

Run a health pass:

```bash
./scripts/health-check.sh
```

## Adding a New Microservice

1. Create a new folder under `services/`.
2. Add a multi-stage Dockerfile and `.dockerignore`.
3. Add `/health` with uptime, version, and service name.
4. Emit structured JSON logs to stdout.
5. Add the service to `docker-compose.yml` on `autoops-network`.
6. Add health checks, labels, environment variables, and README API docs.
7. Add a gateway proxy route if the service is externally consumed.

## Common Issues and Fixes

Port already in use:

```bash
docker compose down --remove-orphans
```

Images look stale:

```bash
docker compose build --no-cache
```

Dependency health is unreachable from the gateway:

```bash
docker compose ps
docker compose logs --tail=100 user-service metrics-collector
```

Windows line ending problems in scripts:

```bash
git config core.autocrlf false
```
