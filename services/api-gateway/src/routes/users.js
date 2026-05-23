const { randomUUID } = require('crypto');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const config = require('../config');
const logger = require('../middleware/logger');

module.exports = createProxyMiddleware({
  target: config.userServiceUrl,
  changeOrigin: true,
  pathRewrite: (path) => `/users${path === '/' ? '' : path}`,
  onProxyReq: (proxyReq, req) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    proxyReq.setHeader('X-Request-ID', requestId);
    fixRequestBody(proxyReq, req);
    logger.info('proxy request', {
      requestId,
      route: 'users',
      method: req.method,
      path: req.originalUrl,
      target: config.userServiceUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('user-service proxy error', { error: err.message, path: req.originalUrl });
    res.status(502).json({ error: 'user-service unavailable', code: 502 });
  }
});
