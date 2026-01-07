const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { 
  globalErrorHandler, 
  notFoundHandler, 
  requestIdMiddleware 
} = require('./middleware/errorHandler');
const { requestLogger, errorRequestLogger } = require('./middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// Request ID middleware - must be first to ensure all requests have IDs
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware with enhanced error handling
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Enhanced request logging middleware
app.use(requestLogger);

// Health check endpoint with enhanced error handling
app.get('/api/health', async (req, res) => {
  try {
    // Use the dedicated health check function
    const { checkDatabaseHealth } = require('./config/database');
    const dbHealth = await checkDatabaseHealth();
    
    if (dbHealth.status === 'connected') {
      logger.info('Health check successful', {
        requestId: req.requestId,
        database: dbHealth.status
      });
      
      res.json({
        success: true,
        message: 'Server is running',
        database: dbHealth.status,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.warn('Health check - database disconnected', {
        requestId: req.requestId,
        database: dbHealth.status,
        error: dbHealth.error
      });
      
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        database: dbHealth.status,
        message: dbHealth.error,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Health check failed', {
      requestId: req.requestId,
      error: error.message,
      database: 'error'
    });
    
    res.status(500).json({
      success: false,
      error: 'HEALTH_CHECK_FAILED',
      database: 'error',
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed status endpoint with enhanced logging
app.get('/api/status', async (req, res) => {
  try {
    const { checkDatabaseHealth } = require('./config/database');
    const dbHealth = await checkDatabaseHealth();
    
    const statusData = {
      success: true,
      server: {
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      database: dbHealth,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    };
    
    logger.info('Status check successful', {
      requestId: req.requestId,
      serverStatus: statusData.server.status,
      databaseStatus: statusData.database.status
    });
    
    // Return 503 if database is not connected
    const statusCode = dbHealth.status === 'connected' ? 200 : 503;
    res.status(statusCode).json(statusData);
  } catch (error) {
    logger.error('Status check failed', {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'STATUS_CHECK_FAILED',
      server: {
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      database: {
        status: 'error',
        error: error.message
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
const taskRoutes = require('./routes/taskRoutes');
app.use('/api/tasks', taskRoutes);

// Error request logging middleware - logs failed requests
app.use(errorRequestLogger);

// Enhanced 404 handler
app.use('*', notFoundHandler);

// Enhanced global error handler
app.use(globalErrorHandler);

// Start server with enhanced error handling
async function startServer() {
  try {
    // Initialize database connection with retry logic
    await connectDatabase();
    logger.info('Database connection established successfully');
    
    // Validate database connectivity on startup
    const { validateDatabaseConnection } = require('./config/database');
    await validateDatabaseConnection();
    logger.info('Database startup validation completed successfully');
    
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
      port: PORT
    });
    process.exit(1);
  }
}

// Handle graceful shutdown with enhanced logging
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, initiating graceful shutdown');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, initiating graceful shutdown');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception occurred', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = app;