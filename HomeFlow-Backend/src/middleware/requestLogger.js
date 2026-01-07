/**
 * Request Logging Middleware
 * Provides comprehensive HTTP request/response logging with performance metrics
 */

const logger = require('../utils/logger');

/**
 * Enhanced request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('HTTP request received', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    // Only log body for non-GET requests and exclude sensitive data
    body: req.method !== 'GET' && req.body ? sanitizeRequestBody(req.body) : undefined
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log response completion
    logger.logRequest(req, res, duration);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Sanitize request body to remove sensitive information
 * @param {Object} body - Request body object
 * @returns {Object} Sanitized body object
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Error request logging middleware - logs failed requests
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorRequestLogger(error, req, res, next) {
  logger.error('Request failed with error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    errorName: error.name,
    errorMessage: error.message,
    errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  });

  next(error);
}

module.exports = {
  requestLogger,
  errorRequestLogger,
  sanitizeRequestBody
};