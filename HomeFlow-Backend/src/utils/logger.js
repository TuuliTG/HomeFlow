/**
 * Enhanced Winston Logger Configuration
 * Provides structured logging with appropriate levels and formats
 */

const winston = require('winston');
const path = require('path');

/**
 * Custom log format for structured logging
 */
const structuredFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'service']
  }),
  winston.format.json()
);

/**
 * Console format for development with colors and readable structure
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let logMessage = `${timestamp} [${service}] ${level}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

/**
 * Create logger instance with enhanced configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: structuredFormat,
  defaultMeta: { 
    service: 'homeflow-backend',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Error log - only errors and above
    new winston.transports.File({ 
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        structuredFormat,
        winston.format.timestamp()
      )
    }),
    
    // Combined log - all levels
    new winston.transports.File({ 
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: structuredFormat
    }),
    
    // Separate log for HTTP requests
    new winston.transports.File({
      filename: path.join('logs', 'requests.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          // Only log HTTP request-related entries
          return info.requestId || info.method ? info : false;
        })()
      )
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Add console transport for development with enhanced formatting
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug'
  }));
}

/**
 * Enhanced logging methods with context support
 */
const enhancedLogger = {
  /**
   * Log error with enhanced context
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   */
  error(message, context = {}) {
    logger.error(message, {
      ...context,
      severity: 'error',
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log warning with context
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    logger.warn(message, {
      ...context,
      severity: 'warning',
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log info with context
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  info(message, context = {}) {
    logger.info(message, {
      ...context,
      severity: 'info',
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log debug information
   * @param {string} message - Debug message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    logger.debug(message, {
      ...context,
      severity: 'debug',
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log HTTP request with structured format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} duration - Request duration in ms
   */
  logRequest(req, res, duration) {
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP request completed with error', logData);
    } else {
      this.info('HTTP request completed', logData);
    }
  },

  /**
   * Log database operations
   * @param {string} operation - Database operation type
   * @param {string} table - Table name
   * @param {Object} context - Additional context
   */
  logDatabase(operation, table, context = {}) {
    this.debug(`Database ${operation}`, {
      ...context,
      operation,
      table,
      component: 'database'
    });
  },

  /**
   * Log validation errors with detailed context
   * @param {string} message - Validation error message
   * @param {Array} errors - Validation error details
   * @param {Object} context - Additional context
   */
  logValidation(message, errors, context = {}) {
    this.warn(message, {
      ...context,
      validationErrors: errors,
      component: 'validation'
    });
  }
};

// Export both the original logger and enhanced methods
module.exports = enhancedLogger;