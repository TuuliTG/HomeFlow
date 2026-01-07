/**
 * API Test Helper for Integration Testing
 * Provides utilities for testing Express API endpoints with Supertest
 */

const request = require('supertest');
const express = require('express');
const TaskModel = require('../src/models/TaskModel');
const TaskService = require('../src/services/TaskService');
const ValidationService = require('../src/services/ValidationService');
const taskRoutes = require('../src/routes/taskRoutes');
const { globalErrorHandler, requestIdMiddleware } = require('../src/middleware/errorHandler');
const { requestLogger } = require('../src/middleware/requestLogger');

class ApiTestHelper {
  constructor() {
    this.app = null;
    this.taskModel = null;
    this.taskService = null;
    this.validationService = null;
  }

  /**
   * Create Express app configured for testing
   */
  createTestApp() {
    const app = express();

    // Add request ID middleware
    app.use(requestIdMiddleware);

    // Configure middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Add request logging in test mode (optional)
    if (process.env.TEST_LOGGING === 'true') {
      app.use(requestLogger);
    }

    // Configure routes
    app.use('/api/tasks', taskRoutes);

    // Add health check endpoint for testing
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Error handling middleware
    app.use(globalErrorHandler);

    this.app = app;
    return app;
  }

  /**
   * Get Supertest request instance
   */
  getRequest() {
    if (!this.app) {
      this.createTestApp();
    }
    return request(this.app);
  }

  /**
   * Test helper for GET requests
   */
  async get(path, expectedStatus = 200) {
    const response = await this.getRequest()
      .get(path)
      .expect(expectedStatus);
    return response;
  }

  /**
   * Test helper for POST requests
   */
  async post(path, data, expectedStatus = 201) {
    const response = await this.getRequest()
      .post(path)
      .send(data)
      .expect(expectedStatus);
    return response;
  }

  /**
   * Test helper for PUT requests
   */
  async put(path, data, expectedStatus = 200) {
    const response = await this.getRequest()
      .put(path)
      .send(data)
      .expect(expectedStatus);
    return response;
  }

  /**
   * Test helper for PATCH requests
   */
  async patch(path, data, expectedStatus = 200) {
    const response = await this.getRequest()
      .patch(path)
      .send(data)
      .expect(expectedStatus);
    return response;
  }

  /**
   * Test helper for DELETE requests
   */
  async delete(path, expectedStatus = 200) {
    const response = await this.getRequest()
      .delete(path)
      .expect(expectedStatus);
    return response;
  }

  /**
   * Create a task via API and return the response
   */
  async createTask(taskData = {}) {
    const defaultTask = {
      title: 'API Test Task',
      description: 'Created via API test',
      category: 'Cleaning',
      points: 10
    };

    const task = { ...defaultTask, ...taskData };
    return await this.post('/api/tasks', task);
  }

  /**
   * Create multiple tasks via API
   */
  async createTasks(count = 3, baseTaskData = {}) {
    const tasks = [];
    for (let i = 0; i < count; i++) {
      const taskData = {
        title: `API Test Task ${i + 1}`,
        ...baseTaskData
      };
      const response = await this.createTask(taskData);
      tasks.push(response.body.data);
    }
    return tasks;
  }

  /**
   * Assert API response structure
   */
  assertApiResponse(response, expectedData = null) {
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('timestamp');
    
    if (response.body.success) {
      // DELETE operations may not return data, only check if data is expected
      if (expectedData !== null || (response.body.data !== undefined)) {
        expect(response.body).toHaveProperty('data');
        if (expectedData) {
          expect(response.body.data).toMatchObject(expectedData);
        }
      }
    } else {
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    }
  }

  /**
   * Assert task object structure
   */
  assertTaskStructure(task) {
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('title');
    expect(task).toHaveProperty('status');
    expect(task).toHaveProperty('createdAt');
    expect(task).toHaveProperty('updatedAt');
    
    // Validate UUID format
    expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    
    // Validate status values
    expect(['available', 'allocated', 'completed']).toContain(task.status);
  }

  /**
   * Assert validation error response
   */
  assertValidationError(response, expectedField = null) {
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('VALIDATION_ERROR');
    expect(response.body).toHaveProperty('message');
    
    if (expectedField) {
      expect(response.body.message).toContain(expectedField);
    }
  }

  /**
   * Wait for async operations to complete
   */
  async waitFor(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up test app resources
   */
  cleanup() {
    this.app = null;
    this.taskModel = null;
    this.taskService = null;
    this.validationService = null;
  }
}

module.exports = ApiTestHelper;