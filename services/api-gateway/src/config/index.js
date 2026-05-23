require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:8000',
  metricsServiceUrl: process.env.METRICS_SERVICE_URL || 'http://metrics-collector:9090',
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimitWindow: 15 * 60 * 1000,
  rateLimitMax: 100
};

module.exports = config;
