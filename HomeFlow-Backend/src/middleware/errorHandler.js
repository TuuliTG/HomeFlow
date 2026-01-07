/**
 * Global Error Handler Middleware
 * Provides standardized error responses and comprehensive error logging
 */

const logger = require('../utils/logger');
const { ValidationError, NotFoundError, ConflictError } = require('../models/Task');

/**
 * Generate a unique request ID for error tracking
 * @returns {string} Unique request identifier
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize error messages to prevent information leakage
 * @param {string} message - Original error message
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {string} Sanitized error message
 */
function sanitizeErrorMessage(message, isDevelopment) {
  if (isDevelopment) {
    return message;
  }
  
  // In production, sanitize potentially sensitive error messages
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /connection string/i,
    /database/i
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return 'An internal error occurred';
    }
  }
  
  return message;
}

/**
 * Format validation errors with detailed field information
 * @param {ValidationError} error - Validation error instance
 * @returns {Object} Formatted validation error response
 */
function formatValidationError(error) {
  const details = error.errors.map(err => ({
    field: err.field,
    message: err.message,
    value: err.value,
    constraint: err.constraint || 'validation_failed'
  }));

  return {
    success: false,
    error: 'VALIDATION_ERROR',
    message: error.message || 'Validation failed',
    details: details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format database errors with appropriate user messages
 * @param {Error} error - Database error
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {Object} Formatted database error response
 */
function formatDatabaseError(error, isDevelopment) {
  let message = 'Database operation failed';
  let errorCode = 'DATABASE_ERROR';
  
  // Handle specific PostgreSQL error codes
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        message = 'A record with this information already exists';
        errorCode = 'DUPLICATE_RECORD';
        break;
      case '23503': // Foreign key violation
        message = 'Referenced record does not exist';
        errorCode = 'INVALID_REFERENCE';
        break;
      case '23514': // Check constraint violation
        message = 'Data violates system constraints';
        errorCode = 'CONSTRAINT_VIOLATION';
        break;
      case '23502': // Not null violation
        message = 'Required field is missing';
        errorCode = 'MISSING_REQUIRED_FIELD';
        break;
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
        message = 'Database connection failed';
        errorCode = 'DATABASE_CONNECTION_ERROR';
        break;
      default:
        if (isDevelopment) {
          message = `Database error: ${error.message}`;
        }
    }
  }

  return {
    success: false,
    error: errorCode,
    message: sanitizeErrorMessage(message, isDevelopment),
    timestamp: new Date().toISOString()
  };
}

/**
 * Global error handler middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function globalErrorHandler(error, req, res, next) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const requestId = req.requestId || generateRequestId();
  
  // Log error with context
  const errorContext = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack
  };

  logger.error('Request error occurred', errorContext);

  // Handle different error types
  let statusCode = 500;
  let errorResponse;

  if (error instanceof ValidationError) {
    statusCode = 400;
    errorResponse = formatValidationError(error);
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    errorResponse = {
      success: false,
      error: 'NOT_FOUND',
      message: error.message || 'Resource not found',
      timestamp: new Date().toISOString()
    };
  } else if (error instanceof ConflictError) {
    statusCode = 409;
    errorResponse = {
      success: false,
      error: 'CONFLICT',
      message: error.message || 'Resource conflict',
      timestamp: new Date().toISOString()
    };
  } else if (error.code && typeof error.code === 'string') {
    // Database errors
    statusCode = 500;
    errorResponse = formatDatabaseError(error, isDevelopment);
  } else if (error.status && typeof error.status === 'number') {
    // Errors with explicit status codes
    statusCode = error.status;
    errorResponse = {
      success: false,
      error: error.name || 'HTTP_ERROR',
      message: sanitizeErrorMessage(error.message || 'An error occurred', isDevelopment),
      timestamp: new Date().toISOString()
    };
  } else {
    // Generic server errors
    statusCode = 500;
    errorResponse = {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: sanitizeErrorMessage(
        isDevelopment ? error.message : 'An unexpected error occurred',
        isDevelopment
      ),
      timestamp: new Date().toISOString()
    };
  }

  // Add request ID to response for tracking
  errorResponse.requestId = requestId;

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler for unmatched routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  const requestId = req.requestId || generateRequestId();
  
  logger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    requestId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Request ID middleware - adds unique ID to each request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestIdMiddleware(req, res, next) {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  requestIdMiddleware,
  generateRequestId,
  sanitizeErrorMessage,
  formatValidationError,
  formatDatabaseError
};