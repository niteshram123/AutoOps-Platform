#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(dirname "$0")"
COMPOSE_FILES=("$ROOT_DIR/docker-compose.yml" "$ROOT_DIR/ci/sonarqube/docker-compose.sonar.yml" "$ROOT_DIR/ci/registry/docker-compose.registry.yml" "$ROOT_DIR/monitoring/docker-compose.monitoring.yml")

docker compose ${COMPOSE_FILES[@]/#/-f } down

echo "All services stopped."
