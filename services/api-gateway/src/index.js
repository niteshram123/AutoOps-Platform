require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const prometheusMiddleware = require('./middleware/prometheusMiddleware');
const { register } = require('./metrics');
const healthRouter = require('./routes/health');
const usersProxy = require('./routes/users');
const metricsProxy = require('./routes/metrics');

const app = express();

app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));
app.use(express.json());

// Prometheus instrumentation middleware — must come before routes
app.use(prometheusMiddleware);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.use('/health', healthRouter);
app.use('/api/users', usersProxy);
app.use('/api/metrics', metricsProxy);
app.use(errorHandler);

function startServer() {
  const server = app.listen(config.port, () => {
    logger.info('service started', {
      service: 'api-gateway',
      status: 'started',
      port: config.port
    });
  });

  function shutdown(signal) {
    logger.info('shutdown signal received', { signal });
    server.close(() => {
      logger.info('service stopped', { service: 'api-gateway', signal });
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('forced shutdown after timeout', { signal });
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
