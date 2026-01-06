/**
 * Task data model and type definitions
 * Defines the structure for task entities and API request/response types
 */

/**
 * Task status enumeration
 * @readonly
 * @enum {string}
 */
const TaskStatus = {
  AVAILABLE: 'available',
  ALLOCATED: 'allocated',
  COMPLETED: 'completed'
};

/**
 * Task category enumeration
 * @readonly
 * @enum {string}
 */
const TaskCategory = {
  CLEANING: 'Cleaning',
  META: 'Meta',
  FOOD: 'Food',
  OTHER: 'Other'
};

/**
 * Task entity structure
 * @typedef {Object} Task
 * @property {string} id - UUID primary key
 * @property {string} title - Required, max 255 characters
 * @property {string} [description] - Optional text description
 * @property {Date} [dueDate] - Optional future date
 * @property {string} [category] - Optional category from TaskCategory enum
 * @property {number} [points] - Optional points value (1-50 range)
 * @property {string} status - Required status from TaskStatus enum, default 'available'
 * @property {string} [assignedTo] - Optional user identifier
 * @property {Date} createdAt - Auto-generated timestamp
 * @property {Date} updatedAt - Auto-updated timestamp
 * @property {Date} [completedAt] - Set when status becomes 'completed'
 */

/**
 * Create task request structure
 * @typedef {Object} CreateTaskRequest
 * @property {string} title - Required task title
 * @property {string} [description] - Optional task description
 * @property {string} [dueDate] - Optional due date in ISO 8601 format
 * @property {string} [category] - Optional category from TaskCategory enum
 * @property {number} [points] - Optional points value (1-50)
 */

/**
 * Update task request structure
 * @typedef {Object} UpdateTaskRequest
 * @property {string} [title] - Optional task title update
 * @property {string} [description] - Optional task description update
 * @property {string} [dueDate] - Optional due date update in ISO 8601 format
 * @property {string} [category] - Optional category update
 * @property {number} [points] - Optional points value update
 * @property {string} [status] - Optional status update
 * @property {string} [assignedTo] - Optional assigned user update
 */

/**
 * Task filters for querying
 * @typedef {Object} TaskFilters
 * @property {string} [status] - Filter by task status
 * @property {string} [category] - Filter by task category
 * @property {string} [assignedTo] - Filter by assigned user
 * @property {string} [dueDate] - Filter by due date
 * @property {number} [points] - Filter by points value
 */

/**
 * API response wrapper
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indicates if the operation was successful
 * @property {*} [data] - Response data (if successful)
 * @property {string} [error] - Error type/code (if failed)
 * @property {string} [message] - Human-readable message
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} [requestId] - Request correlation ID
 */

/**
 * Validation error structure
 * @typedef {Object} ValidationError
 * @property {string} field - Field name that failed validation
 * @property {string} message - Field-specific error message
 * @property {*} [value] - Invalid value provided
 * @property {string} [constraint] - Validation rule that was violated
 */

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {ValidationError[]} errors - Array of validation errors
 */

/**
 * Custom error classes for different error types
 */
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.status = 400;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

/**
 * Utility functions for task data validation
 */
const TaskUtils = {
  /**
   * Check if a status value is valid
   * @param {string} status - Status to validate
   * @returns {boolean} True if valid status
   */
  isValidStatus(status) {
    return Object.values(TaskStatus).includes(status);
  },

  /**
   * Check if a category value is valid
   * @param {string} category - Category to validate
   * @returns {boolean} True if valid category
   */
  isValidCategory(category) {
    return Object.values(TaskCategory).includes(category);
  },

  /**
   * Check if a UUID format is valid
   * @param {string} id - ID to validate
   * @returns {boolean} True if valid UUID format
   */
  isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof id === 'string' && uuidRegex.test(id);
  },

  /**
   * Check if points value is in valid range
   * @param {number} points - Points to validate
   * @returns {boolean} True if valid points value
   */
  isValidPoints(points) {
    return typeof points === 'number' && points >= 1 && points <= 50;
  },

  /**
   * Check if date is in the future
   * @param {Date|string} date - Date to validate
   * @returns {boolean} True if date is in the future
   */
  isFutureDate(date) {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime()) && dateObj > new Date();
  }
};

module.exports = {
  TaskStatus,
  TaskCategory,
  TaskUtils,
  ValidationError,
  NotFoundError,
  ConflictError
};