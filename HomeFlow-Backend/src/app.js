const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connectivity
    const { getPool } = require('./config/database');
    const pool = getPool();
    await pool.query('SELECT 1');
    
    res.json({
      success: true,
      message: 'Server is running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      database: 'disconnected',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const { getPool } = require('./config/database');
    const pool = getPool();
    
    // Check database connectivity and get connection info
    const dbResult = await pool.query('SELECT version(), now() as current_time');
    const dbInfo = dbResult.rows[0];
    
    res.json({
      success: true,
      server: {
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      database: {
        status: 'connected',
        version: dbInfo.version,
        currentTime: dbInfo.current_time,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      server: {
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      database: {
        status: 'disconnected',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
const taskRoutes = require('./routes/taskRoutes');
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, _next) => {
  logger.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await connectDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;