const express = require('express');
const config = require('../config');

const router = express.Router();

async function checkDependency(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${url}/health`, { signal: controller.signal });
    return response.ok ? 'reachable' : 'unreachable';
  } catch (error) {
    return 'unreachable';
  } finally {
    clearTimeout(timeout);
  }
}

router.get('/', async (req, res) => {
  try {
    const [userService, metricsCollector] = await Promise.all([
      checkDependency(config.userServiceUrl),
      checkDependency(config.metricsServiceUrl)
    ]);

    res.status(200).json({
      status: 'healthy',
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        'user-service': userService,
        'metrics-collector': metricsCollector
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
