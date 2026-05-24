@echo off
SET ROOT_DIR=%~dp0

echo Bringing down compose stacks...
docker compose -f %ROOT_DIR%docker-compose.yml -f %ROOT_DIR%ci\sonarqube\docker-compose.sonar.yml -f %ROOT_DIR%ci\registry\docker-compose.registry.yml -f %ROOT_DIR%monitoring\docker-compose.monitoring.yml down

echo Services stopped.
