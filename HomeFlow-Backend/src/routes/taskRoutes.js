/**
 * Task Routes - Express.js route handlers for task CRUD operations
 * Implements RESTful API endpoints with enhanced error handling and validation
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
      logger.logValidation('Invalid request body format', [{
        field: 'body',
        message: 'Request body must be a valid JSON object',
        value: req.body
      }], { requestId: req.requestId });
      
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST_BODY',
        message: 'Request body must be a valid JSON object',
        requestId: req.requestId,
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
  logger.debug('Processing GET /api/tasks request', { 
    requestId: req.requestId,
    query: req.query 
  });
  
  // Extract and validate query parameters with enhanced parsing
  const filters = {};
  const filterErrors = [];
  
  // Status filter
  if (req.query.status) {
    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      filters.status = req.query.status.trim();
    } else {
      filterErrors.push({
        field: 'status',
        message: 'Status filter must be a non-empty string',
        value: req.query.status,
        constraint: 'non_empty_string'
      });
    }
  }
  
  // Category filter
  if (req.query.category) {
    if (typeof req.query.category === 'string' && req.query.category.trim()) {
      filters.category = req.query.category.trim();
    } else {
      filterErrors.push({
        field: 'category',
        message: 'Category filter must be a non-empty string',
        value: req.query.category,
        constraint: 'non_empty_string'
      });
    }
  }
  
  // AssignedTo filter
  if (req.query.assignedTo) {
    if (typeof req.query.assignedTo === 'string' && req.query.assignedTo.trim()) {
      filters.assignedTo = req.query.assignedTo.trim();
    } else {
      filterErrors.push({
        field: 'assignedTo',
        message: 'AssignedTo filter must be a non-empty string',
        value: req.query.assignedTo,
        constraint: 'non_empty_string'
      });
    }
  }
  
  // Due date filter
  if (req.query.dueDate) {
    if (typeof req.query.dueDate === 'string' && req.query.dueDate.trim()) {
      filters.dueDate = req.query.dueDate.trim();
    } else {
      filterErrors.push({
        field: 'dueDate',
        message: 'DueDate filter must be a valid date string',
        value: req.query.dueDate,
        constraint: 'valid_date_string'
      });
    }
  }
  
  // Points filter with enhanced validation
  if (req.query.points !== undefined) {
    const points = parseInt(req.query.points, 10);
    if (!isNaN(points) && points > 0) {
      filters.points = points;
    } else {
      filterErrors.push({
        field: 'points',
        message: 'Points filter must be a positive integer',
        value: req.query.points,
        constraint: 'positive_integer'
      });
    }
  }
  
  // Return validation errors if any filter parameters are invalid
  if (filterErrors.length > 0) {
    logger.logValidation('Invalid filter parameters provided', filterErrors, {
      requestId: req.requestId,
      filters: req.query
    });
    
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILTER_PARAMETERS',
      message: 'One or more filter parameters are invalid',
      details: filterErrors,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  const tasks = await taskService.getAllTasks(filters);
  
  logger.info('Tasks retrieved successfully', {
    requestId: req.requestId,
    count: tasks.length,
    filters: filters
  });
  
  res.json({
    success: true,
    data: tasks,
    count: tasks.length,
    filters: filters, // Include applied filters in response for transparency
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', validateTaskData, asyncHandler(async (req, res) => {
  logger.debug('Processing POST /api/tasks request', { 
    requestId: req.requestId,
    body: req.body 
  });
  
  const task = await taskService.createTask(req.body);
  
  logger.info('Task created successfully', {
    requestId: req.requestId,
    taskId: task.id,
    title: task.title
  });
  
  res.status(201).json({
    success: true,
    data: task,
    message: 'Task created successfully',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/tasks/:id - Get a specific task by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  logger.debug('Processing GET /api/tasks/:id request', { 
    requestId: req.requestId,
    taskId: req.params.id 
  });
  
  const task = await taskService.getTaskById(req.params.id);
  
  if (!task) {
    logger.warn('Task not found', {
      requestId: req.requestId,
      taskId: req.params.id
    });
    
    return res.status(404).json({
      success: false,
      error: 'TASK_NOT_FOUND',
      message: 'Task not found',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  logger.info('Task retrieved successfully', {
    requestId: req.requestId,
    taskId: task.id,
    title: task.title
  });
  
  res.json({
    success: true,
    data: task,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PUT /api/tasks/:id - Update a task
 */
router.put('/:id', validateTaskData, asyncHandler(async (req, res) => {
  logger.debug('Processing PUT /api/tasks/:id request', { 
    requestId: req.requestId,
    taskId: req.params.id,
    body: req.body 
  });
  
  const task = await taskService.updateTask(req.params.id, req.body);
  
  logger.info('Task updated successfully', {
    requestId: req.requestId,
    taskId: task.id,
    title: task.title,
    status: task.status
  });
  
  res.json({
    success: true,
    data: task,
    message: 'Task updated successfully',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * DELETE /api/tasks/:id - Delete a task
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  logger.debug('Processing DELETE /api/tasks/:id request', { 
    requestId: req.requestId,
    taskId: req.params.id 
  });
  
  await taskService.deleteTask(req.params.id);
  
  logger.info('Task deleted successfully', {
    requestId: req.requestId,
    taskId: req.params.id
  });
  
  res.json({
    success: true,
    message: 'Task deleted successfully',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PATCH /api/tasks/:id/claim - Claim an available task
 */
router.patch('/:id/claim', asyncHandler(async (req, res) => {
  logger.debug('Processing PATCH /api/tasks/:id/claim request', { 
    requestId: req.requestId,
    taskId: req.params.id,
    body: req.body 
  });
  
  const { userId } = req.body;
  
  if (!userId) {
    logger.logValidation('Missing user ID for task claim', [{
      field: 'userId',
      message: 'User ID is required to claim a task',
      value: userId
    }], { requestId: req.requestId, taskId: req.params.id });
    
    return res.status(400).json({
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required to claim a task',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  const task = await taskService.claimTask(req.params.id, userId);
  
  logger.info('Task claimed successfully', {
    requestId: req.requestId,
    taskId: task.id,
    userId: userId,
    title: task.title
  });
  
  res.json({
    success: true,
    data: task,
    message: 'Task claimed successfully',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PATCH /api/tasks/:id/unclaim - Unclaim an allocated task
 */
router.patch('/:id/unclaim', asyncHandler(async (req, res) => {
  logger.debug('Processing PATCH /api/tasks/:id/unclaim request', { 
    requestId: req.requestId,
    taskId: req.params.id,
    body: req.body 
  });
  
  const { userId } = req.body;
  
  if (!userId) {
    logger.logValidation('Missing user ID for task unclaim', [{
      field: 'userId',
      message: 'User ID is required to unclaim a task',
      value: userId
    }], { requestId: req.requestId, taskId: req.params.id });
    
    return res.status(400).json({
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required to unclaim a task',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  const task = await taskService.unclaimTask(req.params.id, userId);
  
  logger.info('Task unclaimed successfully', {
    requestId: req.requestId,
    taskId: task.id,
    userId: userId,
    title: task.title
  });
  
  res.json({
    success: true,
    data: task,
    message: 'Task unclaimed successfully',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PATCH /api/tasks/:id/complete - Complete an allocated task
 */
router.patch('/:id/complete', asyncHandler(async (req, res) => {
  logger.debug('Processing PATCH /api/tasks/:id/complete request', { 
    requestId: req.requestId,
    taskId: req.params.id,
    body: req.body 
  });
  
  const { userId } = req.body;
  
  if (!userId) {
    logger.logValidation('Missing user ID for task completion', [{
      field: 'userId',
      message: 'User ID is required to complete a task',
      value: userId
    }], { requestId: req.requestId, taskId: req.params.id });
    
    return res.status(400).json({
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required to complete a task',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  const task = await taskService.completeTask(req.params.id, userId);
  
  logger.info('Task completed successfully', {
    requestId: req.requestId,
    taskId: task.id,
    userId: userId,
    title: task.title,
    completedAt: task.completedAt
  });
  
  res.json({
    success: true,
    data: task,
    message: 'Task completed successfully',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Enhanced error handling middleware for task routes
 */
router.use((error, req, res, next) => {
  logger.error('Task route error occurred', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    errorName: error.name,
    errorMessage: error.message,
    errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  });
  
  if (error instanceof ValidationError) {
    logger.logValidation('Validation error in task route', error.errors, {
      requestId: req.requestId,
      taskId: req.params.id
    });
    
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message,
      details: error.errors || [],
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Pass other errors to global error handler
  next(error);
});

module.exports = router;