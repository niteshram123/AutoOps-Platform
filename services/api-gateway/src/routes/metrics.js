const { randomUUID } = require('crypto');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const config = require('../config');
const logger = require('../middleware/logger');

module.exports = createProxyMiddleware({
  target: config.metricsServiceUrl,
  changeOrigin: true,
  pathRewrite: () => '/api/metrics',
  onProxyReq: (proxyReq, req) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    proxyReq.setHeader('X-Request-ID', requestId);
    fixRequestBody(proxyReq, req);
    logger.info('proxy request', {
      requestId,
      route: 'metrics',
      method: req.method,
      path: req.originalUrl,
      target: config.metricsServiceUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('metrics-collector proxy error', { error: err.message, path: req.originalUrl });
    res.status(502).json({ error: 'metrics-collector unavailable', code: 502 });
  }
});
