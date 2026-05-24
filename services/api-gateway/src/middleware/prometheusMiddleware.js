'use strict';

/**
 * Express middleware that instruments every request with Prometheus metrics:
 *   - Tracks active connections (gauge)
 *   - Records request duration (histogram)
 *   - Increments request counter (counter)
 *
 * Route normalisation collapses dynamic path segments (UUIDs, numeric IDs)
 * so cardinality stays bounded.
 */

const { httpRequestDuration, httpRequestsTotal, activeConnections } = require('../metrics');

/**
 * Normalise a URL path to a low-cardinality route label.
 * e.g. /api/users/550e8400-e29b-41d4-a716-446655440000 → /api/users/:id
 */
function normaliseRoute(path) {
  return path
    // UUID segments
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Pure numeric segments
    .replace(/\/\d+/g, '/:id')
    // Strip query strings
    .replace(/\?.*$/, '');
}

function prometheusMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();
  const service = 'api-gateway';

  // Increment active connections on request start
  activeConnections.inc({ service });

  res.on('finish', () => {
    // Decrement active connections when response is sent
    activeConnections.dec({ service });

    const durationNs = process.hrtime.bigint() - startTime;
    const durationSeconds = Number(durationNs) / 1e9;

    const route = normaliseRoute(req.path || req.url || 'unknown');
    const method = req.method || 'UNKNOWN';
    const statusCode = String(res.statusCode);

    const labels = { method, route, status_code: statusCode };

    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });

  next();
}

module.exports = prometheusMiddleware;
