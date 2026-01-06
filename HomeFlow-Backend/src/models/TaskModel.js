const { getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('./Task');

/**
 * TaskModel class handles all database operations for tasks
 * Uses parameterized queries to prevent SQL injection
 */
class TaskModel {
  constructor() {
    this.pool = null;
  }

  /**
   * Initialize the model with database pool
   */
  init() {
    this.pool = getPool();
  }

  /**
   * Get database pool, initializing if needed
   * @returns {Pool} PostgreSQL connection pool
   */
  getDbPool() {
    if (!this.pool) {
      this.init();
    }
    return this.pool;
  }

  /**
   * Find all tasks with optional filtering
   * @param {Object} filters - Optional filters for querying tasks
   * @param {string} [filters.status] - Filter by task status
   * @param {string} [filters.category] - Filter by task category
   * @param {string} [filters.assignedTo] - Filter by assigned user
   * @param {string} [filters.dueDate] - Filter by due date
   * @param {number} [filters.points] - Filter by points value
   * @returns {Promise<Array>} Array of task objects
   */
  async findAll(filters = {}) {
    try {
      const pool = this.getDbPool();
      
      // Build dynamic query based on filters
      let query = `
        SELECT 
          id, title, description, due_date as "dueDate", category, points,
          status, assigned_to as "assignedTo", created_at as "createdAt",
          updated_at as "updatedAt", completed_at as "completedAt"
        FROM tasks
      `;
      
      const conditions = [];
      const values = [];
      let paramCount = 0;

      // Add filter conditions
      if (filters.status) {
        paramCount++;
        conditions.push(`status = $${paramCount}`);
        values.push(filters.status);
      }

      if (filters.category) {
        paramCount++;
        conditions.push(`category = $${paramCount}`);
        values.push(filters.category);
      }

      if (filters.assignedTo) {
        paramCount++;
        conditions.push(`assigned_to = $${paramCount}`);
        values.push(filters.assignedTo);
      }

      if (filters.dueDate) {
        paramCount++;
        conditions.push(`DATE(due_date) = DATE($${paramCount})`);
        values.push(filters.dueDate);
      }

      if (filters.points) {
        paramCount++;
        conditions.push(`points = $${paramCount}`);
        values.push(filters.points);
      }

      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Order by created_at for consistent results
      query += ' ORDER BY created_at DESC';

      logger.debug('Executing query:', { query, values });
      
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error finding tasks:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  /**
   * Find a task by ID
   * @param {string} id - Task UUID
   * @returns {Promise<Object|null>} Task object or null if not found
   */
  async findById(id) {
    try {
      const pool = this.getDbPool();
      
      const query = `
        SELECT 
          id, title, description, due_date as "dueDate", category, points,
          status, assigned_to as "assignedTo", created_at as "createdAt",
          updated_at as "updatedAt", completed_at as "completedAt"
        FROM tasks 
        WHERE id = $1
      `;
      
      logger.debug('Finding task by ID:', { id });
      
      const result = await pool.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding task by ID:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data to create
   * @param {string} taskData.title - Task title
   * @param {string} [taskData.description] - Task description
   * @param {Date} [taskData.dueDate] - Task due date
   * @param {string} [taskData.category] - Task category
   * @param {number} [taskData.points] - Task points
   * @param {string} [taskData.status] - Task status (defaults to 'available')
   * @param {string} [taskData.assignedTo] - Assigned user
   * @param {Date} [taskData.createdAt] - Creation timestamp
   * @param {Date} [taskData.updatedAt] - Update timestamp
   * @returns {Promise<Object>} Created task object
   */
  async create(taskData) {
    try {
      const pool = this.getDbPool();
      
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO tasks (
          id, title, description, due_date, category, points,
          status, assigned_to, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING 
          id, title, description, due_date as "dueDate", category, points,
          status, assigned_to as "assignedTo", created_at as "createdAt",
          updated_at as "updatedAt", completed_at as "completedAt"
      `;
      
      const values = [
        id,
        taskData.title,
        taskData.description || null,
        taskData.dueDate || null,
        taskData.category || null,
        taskData.points || null,
        taskData.status || 'available',
        taskData.assignedTo || null,
        taskData.createdAt || now,
        taskData.updatedAt || now
      ];
      
      logger.debug('Creating task:', { taskData, values });
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating task:', error);
      
      // Handle specific database constraint violations
      if (error.code === '23514') { // CHECK constraint violation
        throw new ValidationError('Task data violates database constraints', [
          { field: 'data', message: error.detail || 'Invalid data provided' }
        ]);
      }
      
      throw new Error(`Database insert failed: ${error.message}`);
    }
  }

  /**
   * Update an existing task
   * @param {string} id - Task UUID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated task object
   */
  async update(id, updateData) {
    try {
      const pool = this.getDbPool();
      
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      // Add fields to update
      const fieldMappings = {
        title: 'title',
        description: 'description',
        dueDate: 'due_date',
        category: 'category',
        points: 'points',
        status: 'status',
        assignedTo: 'assigned_to',
        updatedAt: 'updated_at',
        completedAt: 'completed_at'
      };

      Object.keys(updateData).forEach(key => {
        if (fieldMappings[key]) {
          paramCount++;
          updateFields.push(`${fieldMappings[key]} = $${paramCount}`);
          values.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      // Add ID parameter
      paramCount++;
      values.push(id);

      const query = `
        UPDATE tasks 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, title, description, due_date as "dueDate", category, points,
          status, assigned_to as "assignedTo", created_at as "createdAt",
          updated_at as "updatedAt", completed_at as "completedAt"
      `;
      
      logger.debug('Updating task:', { id, updateData, query, values });
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Task not found');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      logger.error('Error updating task:', error);
      
      // Handle specific database constraint violations
      if (error.code === '23514') { // CHECK constraint violation
        throw new ValidationError('Update data violates database constraints', [
          { field: 'data', message: error.detail || 'Invalid data provided' }
        ]);
      }
      
      throw new Error(`Database update failed: ${error.message}`);
    }
  }

  /**
   * Delete a task by ID
   * @param {string} id - Task UUID
   * @returns {Promise<boolean>} True if task was deleted
   */
  async delete(id) {
    try {
      const pool = this.getDbPool();
      
      const query = 'DELETE FROM tasks WHERE id = $1';
      
      logger.debug('Deleting task:', { id });
      
      const result = await pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Task not found');
      }
      
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error deleting task:', error);
      throw new Error(`Database delete failed: ${error.message}`);
    }
  }

  /**
   * Count tasks with optional filtering
   * @param {Object} filters - Optional filters for counting tasks
   * @returns {Promise<number>} Number of tasks matching filters
   */
  async count(filters = {}) {
    try {
      const pool = this.getDbPool();
      
      let query = 'SELECT COUNT(*) as count FROM tasks';
      const conditions = [];
      const values = [];
      let paramCount = 0;

      // Add filter conditions (same logic as findAll)
      if (filters.status) {
        paramCount++;
        conditions.push(`status = $${paramCount}`);
        values.push(filters.status);
      }

      if (filters.category) {
        paramCount++;
        conditions.push(`category = $${paramCount}`);
        values.push(filters.category);
      }

      if (filters.assignedTo) {
        paramCount++;
        conditions.push(`assigned_to = $${paramCount}`);
        values.push(filters.assignedTo);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      logger.debug('Counting tasks:', { query, values });
      
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error counting tasks:', error);
      throw new Error(`Database count failed: ${error.message}`);
    }
  }

  /**
   * Check if a task exists by ID
   * @param {string} id - Task UUID
   * @returns {Promise<boolean>} True if task exists
   */
  async exists(id) {
    try {
      const pool = this.getDbPool();
      
      const query = 'SELECT 1 FROM tasks WHERE id = $1 LIMIT 1';
      
      logger.debug('Checking task existence:', { id });
      
      const result = await pool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking task existence:', error);
      throw new Error(`Database existence check failed: ${error.message}`);
    }
  }

  /**
   * Find tasks by status with optional user filter
   * @param {string} status - Task status to filter by
   * @param {string} [userId] - Optional user ID to filter by
   * @returns {Promise<Array>} Array of tasks matching criteria
   */
  async findByStatus(status, userId = null) {
    const filters = { status };
    if (userId) {
      filters.assignedTo = userId;
    }
    return this.findAll(filters);
  }

  /**
   * Find tasks assigned to a specific user
   * @param {string} userId - User ID to filter by
   * @returns {Promise<Array>} Array of tasks assigned to user
   */
  async findByAssignedUser(userId) {
    return this.findAll({ assignedTo: userId });
  }

  /**
   * Find tasks due before a specific date
   * @param {Date} date - Date to filter by
   * @returns {Promise<Array>} Array of tasks due before date
   */
  async findDueBefore(date) {
    try {
      const pool = this.getDbPool();
      
      const query = `
        SELECT 
          id, title, description, due_date as "dueDate", category, points,
          status, assigned_to as "assignedTo", created_at as "createdAt",
          updated_at as "updatedAt", completed_at as "completedAt"
        FROM tasks 
        WHERE due_date < $1 AND status != 'completed'
        ORDER BY due_date ASC
      `;
      
      logger.debug('Finding tasks due before:', { date });
      
      const result = await pool.query(query, [date]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding tasks due before date:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }
}

module.exports = TaskModel;