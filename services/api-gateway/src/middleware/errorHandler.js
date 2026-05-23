const logger = require('./logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const requestId = req.headers['x-request-id'];
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  logger.error('request failed', {
    requestId,
    statusCode,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  res.status(statusCode).json({
    error: message,
    code: statusCode,
    requestId
  });
}

module.exports = errorHandler;
