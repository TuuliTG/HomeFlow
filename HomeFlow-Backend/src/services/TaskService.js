/**
 * TaskService - Business logic layer for task operations
 * Handles CRUD operations, validation, and status management with automatic timestamp handling
 */

const TaskModel = require('../models/TaskModel');
const ValidationService = require('./ValidationService');
const { TaskStatus, ValidationError, NotFoundError, ConflictError } = require('../models/Task');
const logger = require('../utils/logger');

class TaskService {
  constructor() {
    this.taskModel = new TaskModel();
    this.validationService = new ValidationService();
  }

  /**
   * Get all tasks with optional filtering
   * @param {Object} filters - Optional filters for querying tasks
   * @returns {Promise<Array>} Array of task objects
   */
  async getAllTasks(filters = {}) {
    try {
      // Validate filters if provided
      if (Object.keys(filters).length > 0) {
        const validation = this.validationService.validateFilters(filters);
        if (!validation.isValid) {
          throw new ValidationError('Invalid filters', validation.errors);
        }
      }

      logger.info('Getting all tasks', { filters });
      return await this.taskModel.findAll(filters);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error getting all tasks:', error);
      throw new Error(`Failed to retrieve tasks: ${error.message}`);
    }
  }

  /**
   * Get a task by ID
   * @param {string} id - Task UUID
   * @returns {Promise<Object|null>} Task object or null if not found
   */
  async getTaskById(id) {
    try {
      if (!this.validationService.validateTaskId(id)) {
        throw new ValidationError('Invalid task ID format');
      }

      logger.info('Getting task by ID', { id });
      return await this.taskModel.findById(id);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error getting task by ID:', error);
      throw new Error(`Failed to retrieve task: ${error.message}`);
    }
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data for creation
   * @returns {Promise<Object>} Created task object
   */
  async createTask(taskData) {
    try {
      // Validate task data
      const validation = this.validationService.validateTaskData(taskData);
      if (!validation.isValid) {
        throw new ValidationError('Invalid task data', validation.errors);
      }

      // Prepare task data with automatic timestamps
      const now = new Date();
      const task = {
        ...taskData,
        status: TaskStatus.AVAILABLE, // New tasks are always available
        createdAt: now,
        updatedAt: now
      };

      logger.info('Creating new task', { taskData: task });
      return await this.taskModel.create(task);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Update an existing task
   * @param {string} id - Task UUID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated task object
   */
  async updateTask(id, updates) {
    try {
      // Validate task ID
      if (!this.validationService.validateTaskId(id)) {
        throw new ValidationError('Invalid task ID format');
      }

      // Validate update data
      const validation = this.validationService.validateTaskData(updates, true);
      if (!validation.isValid) {
        throw new ValidationError('Invalid update data', validation.errors);
      }

      // Get existing task
      const existingTask = await this.getTaskById(id);
      if (!existingTask) {
        throw new NotFoundError('Task not found');
      }

      // Validate business rules for the update
      const businessValidation = this.validationService.validateTaskUpdate(existingTask, updates);
      if (!businessValidation.isValid) {
        throw new ValidationError('Update violates business rules', businessValidation.errors);
      }

      // Prepare update data with automatic timestamp management
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      // Handle completion timestamp when status changes to completed
      if (updates.status === TaskStatus.COMPLETED && existingTask.status !== TaskStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (updates.status && updates.status !== TaskStatus.COMPLETED) {
        updateData.completedAt = null;
      }

      // Handle assignment clearing for status changes to available
      if (updates.status === TaskStatus.AVAILABLE) {
        updateData.assignedTo = null;
      }

      logger.info('Updating task', { id, updates: updateData });
      return await this.taskModel.update(id, updateData);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Delete a task
   * @param {string} id - Task UUID
   * @returns {Promise<void>}
   */
  async deleteTask(id) {
    try {
      // Validate task ID
      if (!this.validationService.validateTaskId(id)) {
        throw new ValidationError('Invalid task ID format');
      }

      // Get existing task to validate deletion rules
      const task = await this.getTaskById(id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Validate deletion rules
      const validation = this.validationService.validateTaskDeletion(task);
      if (!validation.isValid) {
        throw new ValidationError('Cannot delete task', validation.errors);
      }

      logger.info('Deleting task', { id });
      await this.taskModel.delete(id);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Claim an available task
   * @param {string} id - Task UUID
   * @param {string} userId - User ID claiming the task
   * @returns {Promise<Object>} Updated task object
   */
  async claimTask(id, userId) {
    try {
      // Validate inputs
      if (!this.validationService.validateTaskId(id)) {
        throw new ValidationError('Invalid task ID format');
      }
      if (!this.validationService.validateUserId(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      // Get existing task
      const task = await this.getTaskById(id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Validate claim rules
      const validation = this.validationService.validateTaskClaim(task);
      if (!validation.isValid) {
        throw new ValidationError('Cannot claim task', validation.errors);
      }

      // Update task with claim data and automatic timestamps
      const now = new Date();
      const updateData = {
        status: TaskStatus.ALLOCATED,
        assignedTo: userId,
        updatedAt: now
      };

      logger.info('Claiming task', { id, userId });
      return await this.taskModel.update(id, updateData);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error claiming task:', error);
      throw new Error(`Failed to claim task: ${error.message}`);
    }
  }

  /**
   * Unclaim an allocated task
   * @param {string} id - Task UUID
   * @param {string} userId - User ID unclaiming the task
   * @returns {Promise<Object>} Updated task object
   */
  async unclaimTask(id, userId) {
    try {
      // Validate inputs
      if (!this.validationService.validateTaskId(id)) {
        throw new ValidationError('Invalid task ID format');
      }
      if (!this.validationService.validateUserId(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      // Get existing task
      const task = await this.getTaskById(id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Validate unclaim rules
      const validation = this.validationService.validateTaskUnclaim(task, userId);
      if (!validation.isValid) {
        throw new ValidationError('Cannot unclaim task', validation.errors);
      }

      // Update task with unclaim data and automatic timestamps
      const now = new Date();
      const updateData = {
        status: TaskStatus.AVAILABLE,
        assignedTo: null,
        updatedAt: now
      };

      logger.info('Unclaiming task', { id, userId });
      return await this.taskModel.update(id, updateData);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error unclaiming task:', error);
      throw new Error(`Failed to unclaim task: ${error.message}`);
    }
  }

  /**
   * Complete an allocated task
   * @param {string} id - Task UUID
   * @param {string} userId - User ID completing the task
   * @returns {Promise<Object>} Updated task object
   */
  async completeTask(id, userId) {
    try {
      // Validate inputs
      if (!this.validationService.validateTaskId(id)) {
        throw new ValidationError('Invalid task ID format');
      }
      if (!this.validationService.validateUserId(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      // Get existing task
      const task = await this.getTaskById(id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Validate completion rules
      const validation = this.validationService.validateTaskCompletion(task, userId);
      if (!validation.isValid) {
        throw new ValidationError('Cannot complete task', validation.errors);
      }

      // Update task with completion data and automatic timestamps
      const now = new Date();
      const updateData = {
        status: TaskStatus.COMPLETED,
        completedAt: now,
        updatedAt: now
      };

      logger.info('Completing task', { id, userId });
      return await this.taskModel.update(id, updateData);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error completing task:', error);
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  }

  /**
   * Get tasks by status with optional user filter
   * @param {string} status - Task status to filter by
   * @param {string} [userId] - Optional user ID to filter by
   * @returns {Promise<Array>} Array of tasks matching criteria
   */
  async getTasksByStatus(status, userId = null) {
    try {
      const filters = { status };
      if (userId) {
        filters.assignedTo = userId;
      }
      return await this.getAllTasks(filters);
    } catch (error) {
      logger.error('Error getting tasks by status:', error);
      throw new Error(`Failed to get tasks by status: ${error.message}`);
    }
  }

  /**
   * Get tasks assigned to a specific user
   * @param {string} userId - User ID to filter by
   * @returns {Promise<Array>} Array of tasks assigned to user
   */
  async getTasksByUser(userId) {
    try {
      if (!this.validationService.validateUserId(userId)) {
        throw new ValidationError('Invalid user ID');
      }
      
      return await this.getAllTasks({ assignedTo: userId });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error getting tasks by user:', error);
      throw new Error(`Failed to get tasks by user: ${error.message}`);
    }
  }

  /**
   * Get task count with optional filtering
   * @param {Object} filters - Optional filters for counting tasks
   * @returns {Promise<number>} Number of tasks matching filters
   */
  async getTaskCount(filters = {}) {
    try {
      // Validate filters if provided
      if (Object.keys(filters).length > 0) {
        const validation = this.validationService.validateFilters(filters);
        if (!validation.isValid) {
          throw new ValidationError('Invalid filters', validation.errors);
        }
      }

      logger.info('Getting task count', { filters });
      return await this.taskModel.count(filters);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error getting task count:', error);
      throw new Error(`Failed to get task count: ${error.message}`);
    }
  }

  /**
   * Check if a task exists
   * @param {string} id - Task UUID
   * @returns {Promise<boolean>} True if task exists
   */
  async taskExists(id) {
    try {
      if (!this.validationService.validateTaskId(id)) {
        return false;
      }
      
      return await this.taskModel.exists(id);
    } catch (error) {
      logger.error('Error checking task existence:', error);
      return false;
    }
  }
}

module.exports = TaskService;