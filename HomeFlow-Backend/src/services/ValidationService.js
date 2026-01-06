/**
 * ValidationService - Handles input validation and business rule validation
 * Implements validation logic for task operations and status transitions
 */

const { TaskStatus, TaskCategory, TaskUtils } = require('../models/Task');

class ValidationService {
  /**
   * Validate task data for creation or update operations
   * @param {Object} data - Task data to validate
   * @param {boolean} isUpdate - Whether this is an update operation (allows partial data)
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateTaskData(data, isUpdate = false) {
    const errors = [];

    // Title validation
    if (!isUpdate || data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push({
          field: 'title',
          message: 'Title is required and must be a non-empty string',
          value: data.title,
          constraint: 'required_string'
        });
      } else if (data.title.length > 255) {
        errors.push({
          field: 'title',
          message: 'Title must be 255 characters or less',
          value: data.title,
          constraint: 'max_length_255'
        });
      }
    }

    // Description validation (optional)
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        errors.push({
          field: 'description',
          message: 'Description must be a string',
          value: data.description,
          constraint: 'string_type'
        });
      }
    }

    // Due date validation (optional)
    if (data.dueDate !== undefined && data.dueDate !== null) {
      const dueDate = new Date(data.dueDate);
      if (isNaN(dueDate.getTime())) {
        errors.push({
          field: 'dueDate',
          message: 'Due date must be a valid date',
          value: data.dueDate,
          constraint: 'valid_date'
        });
      } else if (dueDate <= new Date()) {
        errors.push({
          field: 'dueDate',
          message: 'Due date must be in the future',
          value: data.dueDate,
          constraint: 'future_date'
        });
      }
    }

    // Category validation (optional)
    if (data.category !== undefined && data.category !== null) {
      if (!TaskUtils.isValidCategory(data.category)) {
        errors.push({
          field: 'category',
          message: `Category must be one of: ${Object.values(TaskCategory).join(', ')}`,
          value: data.category,
          constraint: 'valid_category'
        });
      }
    }

    // Points validation (optional)
    if (data.points !== undefined && data.points !== null) {
      if (!TaskUtils.isValidPoints(data.points)) {
        errors.push({
          field: 'points',
          message: 'Points must be a number between 1 and 50',
          value: data.points,
          constraint: 'points_range'
        });
      }
    }

    // Status validation (for updates)
    if (data.status !== undefined) {
      if (!TaskUtils.isValidStatus(data.status)) {
        errors.push({
          field: 'status',
          message: `Status must be one of: ${Object.values(TaskStatus).join(', ')}`,
          value: data.status,
          constraint: 'valid_status'
        });
      }
    }

    // AssignedTo validation (optional)
    if (data.assignedTo !== undefined && data.assignedTo !== null) {
      if (typeof data.assignedTo !== 'string' || data.assignedTo.trim().length === 0) {
        errors.push({
          field: 'assignedTo',
          message: 'Assigned user must be a non-empty string',
          value: data.assignedTo,
          constraint: 'valid_user_id'
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate task ID format
   * @param {string} id - Task ID to validate
   * @returns {boolean} True if valid UUID format
   */
  validateTaskId(id) {
    return TaskUtils.isValidUUID(id);
  }

  /**
   * Validate user ID format
   * @param {string} userId - User ID to validate
   * @returns {boolean} True if valid user ID
   */
  validateUserId(userId) {
    return typeof userId === 'string' && userId.trim().length > 0;
  }

  /**
   * Validate filter parameters for task queries
   * @param {Object} filters - Filter parameters to validate
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateFilters(filters) {
    const errors = [];

    if (filters.status && !TaskUtils.isValidStatus(filters.status)) {
      errors.push({
        field: 'status',
        message: `Status filter must be one of: ${Object.values(TaskStatus).join(', ')}`,
        value: filters.status,
        constraint: 'valid_status_filter'
      });
    }

    if (filters.category && !TaskUtils.isValidCategory(filters.category)) {
      errors.push({
        field: 'category',
        message: `Category filter must be one of: ${Object.values(TaskCategory).join(', ')}`,
        value: filters.category,
        constraint: 'valid_category_filter'
      });
    }

    if (filters.assignedTo && (typeof filters.assignedTo !== 'string' || filters.assignedTo.trim().length === 0)) {
      errors.push({
        field: 'assignedTo',
        message: 'AssignedTo filter must be a non-empty string',
        value: filters.assignedTo,
        constraint: 'valid_user_filter'
      });
    }

    if (filters.points !== undefined) {
      if (!TaskUtils.isValidPoints(filters.points)) {
        errors.push({
          field: 'points',
          message: 'Points filter must be a number between 1 and 50',
          value: filters.points,
          constraint: 'valid_points_filter'
        });
      }
    }

    if (filters.dueDate) {
      const dueDate = new Date(filters.dueDate);
      if (isNaN(dueDate.getTime())) {
        errors.push({
          field: 'dueDate',
          message: 'Due date filter must be a valid date',
          value: filters.dueDate,
          constraint: 'valid_date_filter'
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate status transition rules
   * @param {string} currentStatus - Current task status
   * @param {string} newStatus - Desired new status
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [TaskStatus.AVAILABLE]: [TaskStatus.ALLOCATED],
      [TaskStatus.ALLOCATED]: [TaskStatus.COMPLETED, TaskStatus.AVAILABLE], // can unclaim back to available
      [TaskStatus.COMPLETED]: [] // completed tasks cannot change status
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        isValid: false,
        errors: [{
          field: 'status',
          message: `Cannot transition from ${currentStatus} to ${newStatus}`,
          value: newStatus,
          constraint: 'invalid_status_transition'
        }]
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validate task deletion rules
   * @param {Object} task - Task to validate for deletion
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateTaskDeletion(task) {
    if (task.status !== TaskStatus.AVAILABLE) {
      return {
        isValid: false,
        errors: [{
          field: 'status',
          message: 'Only available tasks can be deleted',
          value: task.status,
          constraint: 'deletion_status_restriction'
        }]
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validate task claiming rules
   * @param {Object} task - Task to validate for claiming
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateTaskClaim(task) {
    if (task.status !== TaskStatus.AVAILABLE) {
      return {
        isValid: false,
        errors: [{
          field: 'status',
          message: 'Only available tasks can be claimed',
          value: task.status,
          constraint: 'claim_status_restriction'
        }]
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validate task unclaiming rules
   * @param {Object} task - Task to validate for unclaiming
   * @param {string} userId - User attempting to unclaim
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateTaskUnclaim(task, userId) {
    const errors = [];

    if (task.status !== TaskStatus.ALLOCATED) {
      errors.push({
        field: 'status',
        message: 'Only allocated tasks can be unclaimed',
        value: task.status,
        constraint: 'unclaim_status_restriction'
      });
    }

    if (task.assignedTo !== userId) {
      errors.push({
        field: 'assignedTo',
        message: 'Only the assigned user can unclaim this task',
        value: userId,
        constraint: 'unclaim_permission_restriction'
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate task completion rules
   * @param {Object} task - Task to validate for completion
   * @param {string} userId - User attempting to complete
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateTaskCompletion(task, userId) {
    const errors = [];

    if (task.status !== TaskStatus.ALLOCATED) {
      errors.push({
        field: 'status',
        message: 'Only allocated tasks can be completed',
        value: task.status,
        constraint: 'completion_status_restriction'
      });
    }

    if (task.assignedTo !== userId) {
      errors.push({
        field: 'assignedTo',
        message: 'Only the assigned user can complete this task',
        value: userId,
        constraint: 'completion_permission_restriction'
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate business rules for task updates
   * @param {Object} task - Current task state
   * @param {Object} updates - Proposed updates
   * @returns {Object} ValidationResult with isValid flag and errors array
   */
  validateTaskUpdate(task, updates) {
    const errors = [];

    // If status is being updated, validate the transition
    if (updates.status && updates.status !== task.status) {
      const transitionValidation = this.validateStatusTransition(task.status, updates.status);
      if (!transitionValidation.isValid) {
        errors.push(...transitionValidation.errors);
      }
    }

    // If status is being set to allocated, ensure assignedTo is provided
    if (updates.status === TaskStatus.ALLOCATED && !updates.assignedTo && !task.assignedTo) {
      errors.push({
        field: 'assignedTo',
        message: 'Allocated tasks must have an assigned user',
        value: updates.assignedTo,
        constraint: 'allocated_requires_assignee'
      });
    }

    // If status is being set to available, assignedTo should be cleared
    if (updates.status === TaskStatus.AVAILABLE && updates.assignedTo) {
      errors.push({
        field: 'assignedTo',
        message: 'Available tasks cannot have an assigned user',
        value: updates.assignedTo,
        constraint: 'available_no_assignee'
      });
    }

    return { isValid: errors.length === 0, errors };
  }
}

module.exports = ValidationService;