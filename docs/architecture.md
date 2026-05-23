# AutoOps Architecture

## Design Decisions

AutoOps Phase 1 is intentionally small but production-shaped. The stack uses three independently built services so CI/CD, deployment, health checks, observability, and service boundaries can be demonstrated without adding external databases or cloud dependencies too early.

- API Gateway centralizes external traffic, security headers, rate limiting, and proxy behavior.
- User Service owns user CRUD behavior with an in-memory store for Phase 1.
- Metrics Collector exposes operational telemetry through both JSON summary endpoints and Prometheus exposition.
- Docker Compose supplies deterministic local orchestration, service discovery, and health-gated startup.

## Network Topology

All containers join the `autoops-network` bridge network on subnet `172.20.0.0/24`.

External access:

- `localhost:3000` routes to `api-gateway`
- `localhost:8000` routes directly to `user-service`
- `localhost:9091` routes to the metrics collector HTTP API
- `localhost:9090/metrics` exposes Prometheus metrics

Internal service discovery uses Docker DNS:

- `http://user-service:8000`
- `http://metrics-collector:9091`

## Service Communication

The browser or API client can call the gateway for normal traffic. The gateway proxies:

- `/api/users` to `user-service:/users`
- `/api/metrics` to `metrics-collector:/api/metrics`

The gateway health endpoint actively checks both downstream services and reports dependency reachability while still returning HTTP 200 when the gateway itself is healthy.

## Health Check Strategy

Each service exposes `/health` and has a Docker health check:

- API Gateway uses `wget` against `localhost:3000/health`
- User Service uses Python `urllib.request` against `localhost:8000/health`
- Metrics Collector uses `wget` against `localhost:9091/health`

Compose starts the gateway only after the two backing services report healthy.

## Logging Strategy

All services emit structured JSON logs in production:

- API Gateway uses Winston and Morgan.
- User Service uses `python-json-logger` and request middleware.
- Metrics Collector writes JSON events to stdout.

Request logs include method, path, status, timing, and request IDs where applicable. This format is ready for later ingestion by ELK, Loki, OpenSearch, or cloud logging.

## Future Phases Preview

Phase 2 can add CI pipelines and quality gates. Phase 3 can add real monitoring with Prometheus and Grafana. Phase 4 can introduce AI-assisted failure diagnosis. Phase 5 can polish security, cloud deployment, and portfolio-grade runbooks.
