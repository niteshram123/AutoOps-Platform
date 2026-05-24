'use strict';

/**
 * Prometheus metrics for the API Gateway.
 * Uses prom-client to expose:
 *   - http_request_duration_seconds  (Histogram)
 *   - http_requests_total            (Counter)
 *   - active_connections             (Gauge)
 *   - proxy_errors_total             (Counter)
 */

const client = require('prom-client');

// Use a dedicated registry so we don't accidentally expose other libs' metrics
const register = new client.Registry();

// Collect default Node.js metrics (event loop lag, GC, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
  labels: { service: 'api-gateway' }
});

// ── Custom metrics ────────────────────────────────────────────

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active HTTP connections being processed',
  labelNames: ['service'],
  registers: [register]
});

const proxyErrorsTotal = new client.Counter({
  name: 'proxy_errors_total',
  help: 'Total number of proxy errors',
  labelNames: ['target_service', 'error_type'],
  registers: [register]
});

// Initialise the gauge so it appears in /metrics even before traffic
activeConnections.set({ service: 'api-gateway' }, 0);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  activeConnections,
  proxyErrorsTotal
};
