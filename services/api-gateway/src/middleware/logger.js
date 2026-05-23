const winston = require('winston');
const config = require('../config');

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    info.service = 'api-gateway';
    return info;
  })(),
  winston.format.json()
);

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metadata = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metadata}`;
  })
);

const logger = winston.createLogger({
  level: config.logLevel,
  format: config.nodeEnv === 'production' ? productionFormat : developmentFormat,
  transports: [new winston.transports.Console()]
});

module.exports = logger;
