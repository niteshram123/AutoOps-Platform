#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

for cmd in docker jq curl; do
  need "$cmd"
done

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Missing required command: docker compose or docker-compose" >&2
  exit 1
fi

if ! docker network inspect autoops-network >/dev/null 2>&1; then
  docker network create autoops-network
fi

mkdir -p ci/registry/auth
if [ ! -f ci/registry/auth/htpasswd ]; then
  docker run --rm --entrypoint htpasswd httpd:2.4-alpine -Bbn admin autoops-registry-2024 > ci/registry/auth/htpasswd
fi

"${COMPOSE[@]}" -f ci/registry/docker-compose.registry.yml up -d
"${COMPOSE[@]}" -f ci/sonarqube/docker-compose.sonar.yml up -d

echo "Waiting for Jenkins..."
for _ in {1..12}; do
  if curl -fsS http://localhost:8080/api/json >/dev/null 2>&1; then
    break
  fi
  sleep 10
done
curl -fsS http://localhost:8080/api/json >/dev/null

echo "Waiting for SonarQube..."
for _ in {1..36}; do
  status="$(curl -fsS http://localhost:9000/api/system/status 2>/dev/null | jq -r '.status // empty' || true)"
  if [ "$status" = "UP" ]; then
    break
  fi
  sleep 10
done

curl -fsS -u admin:admin -X POST "http://localhost:9000/api/projects/create?name=AutoOps+Platform&project=autoops-platform" >/dev/null || true
token="$(curl -fsS -u admin:admin -X POST "http://localhost:9000/api/user_tokens/generate?name=autoops-ci-$(date +%s)" | jq -r '.token')"

cat <<SUMMARY

AutoOps CI stack is ready.
Jenkins:     http://localhost:8080 (admin / autoops-admin-2024)
SonarQube:   http://localhost:9000 (admin / admin)
Registry:    http://localhost:5000
Registry UI: http://localhost:5001

Generated SonarQube token:
$token

Update SONARQUBE_TOKEN for Jenkins with this token before enforcing quality gates.
SUMMARY
