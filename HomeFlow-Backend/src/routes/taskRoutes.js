/**
 * Task Routes - Express.js route handlers for task CRUD operations
 * Implements RESTful API endpoints with proper error handling and validation
 */

const express = require('express');
const TaskService = require('../services/TaskService');
const { ValidationError, NotFoundError } = require('../models/Task');
const logger = require('../utils/logger');

const router = express.Router();
const taskService = new TaskService();

/**
 * Middleware to handle async route errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware to validate request body for task operations
 */
const validateTaskData = (req, res, next) => {
  // Basic request body validation
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST_BODY',
        message: 'Request body must be a valid JSON object',
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
};

/**
 * GET /api/tasks - Get all tasks with optional filtering
 */
router.get('/', asyncHandler(async (req, res) => {
  logger.info('GET /api/tasks', { query: req.query });
  
  // Extract and validate query parameters
  const filters = {};
  
  if (req.query.status) {
    filters.status = req.query.status;
  }
  
  if (req.query.category) {
    filters.category = req.query.category;
  }
  
  if (req.query.assignedTo) {
    filters.assignedTo = req.query.assignedTo;
  }
  
  if (req.query.dueDate) {
    filters.dueDate = req.query.dueDate;
  }
  
  if (req.query.points) {
    const points = parseInt(req.query.points, 10);
    if (!isNaN(points)) {
      filters.points = points;
    }
  }

  const tasks = await taskService.getAllTasks(filters);
  
  res.json({
    success: true,
    data: tasks,
    count: tasks.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', validateTaskData, asyncHandler(async (req, res) => {
  logger.info('POST /api/tasks', { body: req.body });
  
  const task = await taskService.createTask(req.body);
  
  res.status(201).json({
    success: true,
    data: task,
    message: 'Task created successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/tasks/:id - Get a specific task by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  logger.info('GET /api/tasks/:id', { id: req.params.id });
  
  const task = await taskService.getTaskById(req.params.id);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'TASK_NOT_FOUND',
      message: 'Task not found',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: task,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PUT /api/tasks/:id - Update a task
 */
router.put('/:id', validateTaskData, asyncHandler(async (req, res) => {
  logger.info('PUT /api/tasks/:id', { id: req.params.id, body: req.body });
  
  const task = await taskService.updateTask(req.params.id, req.body);
  
  res.json({
    success: true,
    data: task,
    message: 'Task updated successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * DELETE /api/tasks/:id - Delete a task
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  logger.info('DELETE /api/tasks/:id', { id: req.params.id });
  
  await taskService.deleteTask(req.params.id);
  
  res.json({
    success: true,
    message: 'Task deleted successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * PATCH /api/tasks/:id/claim - Claim an available task
 */
router.patch('/:id/claim', asyncHandler(async (req, res) => {
  logger.info('PATCH /api/tasks/:id/claim', { id: req.params.id, body: req.body });
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required to claim a task',
      timestamp: new Date().toISOString()
    });
  }
  
  const task = await taskService.claimTask(req.params.id, userId);
  
  res.json({
    success: true,
    data: task,
    message: 'Task claimed successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * PATCH /api/tasks/:id/unclaim - Unclaim an allocated task
 */
router.patch('/:id/unclaim', asyncHandler(async (req, res) => {
  logger.info('PATCH /api/tasks/:id/unclaim', { id: req.params.id, body: req.body });
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required to unclaim a task',
      timestamp: new Date().toISOString()
    });
  }
  
  const task = await taskService.unclaimTask(req.params.id, userId);
  
  res.json({
    success: true,
    data: task,
    message: 'Task unclaimed successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * PATCH /api/tasks/:id/complete - Complete an allocated task
 */
router.patch('/:id/complete', asyncHandler(async (req, res) => {
  logger.info('PATCH /api/tasks/:id/complete', { id: req.params.id, body: req.body });
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required to complete a task',
      timestamp: new Date().toISOString()
    });
  }
  
  const task = await taskService.completeTask(req.params.id, userId);
  
  res.json({
    success: true,
    data: task,
    message: 'Task completed successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * Error handling middleware for task routes
 */
router.use((error, req, res, next) => {
  logger.error('Task route error:', error);
  
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message,
      details: error.errors || [],
      timestamp: new Date().toISOString()
    });
  }
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Pass other errors to global error handler
  next(error);
});

module.exports = router;