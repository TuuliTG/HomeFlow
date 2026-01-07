/**
 * Test Utilities for HomeFlow Backend
 * Provides database setup, cleanup, and mock data generation for tests
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class TestUtils {
  constructor() {
    this.testPool = null;
    this.testDatabaseUrl = process.env.TEST_DATABASE_URL || 
      'postgresql://homeflow_user:homeflow_pass@127.0.0.1:5434/homeflow_test';
  }

  /**
   * Initialize test database connection
   */
  async initializeTestDatabase() {
    if (!this.testPool) {
      this.testPool = new Pool({
        connectionString: this.testDatabaseUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }

    // Test connection
    try {
      const client = await this.testPool.connect();
      client.release();
    } catch (error) {
      throw new Error(`Failed to connect to test database: ${error.message}`);
    }
  }

  /**
   * Close test database connection
   */
  async closeTestDatabase() {
    if (this.testPool) {
      await this.testPool.end();
      this.testPool = null;
    }
  }

  /**
   * Clean all test data from database
   */
  async cleanDatabase() {
    if (!this.testPool) {
      throw new Error('Test database not initialized');
    }

    const client = await this.testPool.connect();
    try {
      // Disable foreign key checks temporarily if needed
      await client.query('BEGIN');
      
      // Clean tasks table
      await client.query('DELETE FROM tasks');
      
      // Reset sequences if any
      // Note: UUID primary keys don't use sequences, but keeping for future use
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run database migrations on test database
   */
  async runMigrations() {
    if (!this.testPool) {
      throw new Error('Test database not initialized');
    }

    const client = await this.testPool.connect();
    try {
      // Create tasks table if it doesn't exist
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          due_date TIMESTAMP WITH TIME ZONE,
          category VARCHAR(50) CHECK (category IN ('Cleaning', 'Meta', 'Food', 'Other')),
          points INTEGER CHECK (points >= 1 AND points <= 50),
          status VARCHAR(20) NOT NULL DEFAULT 'available' 
            CHECK (status IN ('available', 'allocated', 'completed')),
          assigned_to VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      `);

    } catch (error) {
      throw new Error(`Failed to run migrations: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Create mock task data
   */
  createMockTask(overrides = {}) {
    const now = new Date();
    return {
      id: uuidv4(),
      title: 'Test Task',
      description: 'Test task description',
      dueDate: null,
      category: 'Cleaning',
      points: 10,
      status: 'available',
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      ...overrides
    };
  }

  /**
   * Create multiple mock tasks
   */
  createMockTasks(count = 3, baseOverrides = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.createMockTask({
        title: `Test Task ${index + 1}`,
        ...baseOverrides
      })
    );
  }

  /**
   * Insert task directly into test database
   */
  async insertTask(taskData) {
    if (!this.testPool) {
      throw new Error('Test database not initialized');
    }

    const task = this.createMockTask(taskData);
    const client = await this.testPool.connect();
    
    try {
      const query = `
        INSERT INTO tasks (
          id, title, description, due_date, category, points, 
          status, assigned_to, created_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        task.id,
        task.title,
        task.description,
        task.dueDate,
        task.category,
        task.points,
        task.status,
        task.assignedTo,
        task.createdAt,
        task.updatedAt,
        task.completedAt
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Insert multiple tasks into test database
   */
  async insertTasks(tasksData) {
    const insertedTasks = [];
    for (const taskData of tasksData) {
      const task = await this.insertTask(taskData);
      insertedTasks.push(task);
    }
    return insertedTasks;
  }

  /**
   * Get task by ID from test database
   */
  async getTaskById(id) {
    if (!this.testPool) {
      throw new Error('Test database not initialized');
    }

    const client = await this.testPool.connect();
    try {
      const result = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get all tasks from test database
   */
  async getAllTasks() {
    if (!this.testPool) {
      throw new Error('Test database not initialized');
    }

    const client = await this.testPool.connect();
    try {
      const result = await client.query('SELECT * FROM tasks ORDER BY created_at');
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Count tasks in test database
   */
  async countTasks() {
    if (!this.testPool) {
      throw new Error('Test database not initialized');
    }

    const client = await this.testPool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM tasks');
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  /**
   * Create API test request data
   */
  createApiTaskRequest(overrides = {}) {
    return {
      title: 'API Test Task',
      description: 'Task created via API test',
      category: 'Cleaning',
      points: 15,
      ...overrides
    };
  }

  /**
   * Wait for database to be ready
   */
  async waitForDatabase(maxAttempts = 10, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.initializeTestDatabase();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Database not ready after ${maxAttempts} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Get database connection for custom queries
   */
  async getConnection() {
    if (!this.testPool) {
      throw new Error('Test database not initialized');
    }
    return await this.testPool.connect();
  }
}

module.exports = TestUtils;