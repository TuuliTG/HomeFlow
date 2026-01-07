const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;

const createPool = (databaseUrl) => {
  return new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

// Database connection retry logic with exponential backoff
const connectWithRetry = async (databaseUrl, maxRetries = 5, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Database connection attempt ${attempt}/${maxRetries}`);
      
      const testPool = createPool(databaseUrl);
      
      // Test the connection
      const client = await testPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      logger.info('Database connection test successful');
      return testPool;
    } catch (error) {
      lastError = error;
      logger.warn(`Database connection attempt ${attempt} failed`, {
        error: error.message,
        attempt,
        maxRetries
      });
      
      if (attempt === maxRetries) {
        logger.error('All database connection attempts failed', {
          error: error.message,
          totalAttempts: maxRetries
        });
        throw error;
      }
      
      // Exponential backoff: delay = baseDelay * 2^(attempt-1)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.info(`Retrying database connection in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

const connectDatabase = async () => {
  try {
    const databaseUrl = process.env.NODE_ENV === 'test' 
      ? process.env.TEST_DATABASE_URL 
      : process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('Database URL not configured');
    }

    // Use retry logic for database connection
    pool = await connectWithRetry(databaseUrl);
    
    logger.info('Database connected successfully');
    return pool;
  } catch (error) {
    logger.error('Database connection failed after all retries:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

// Health check function for database connectivity
const checkDatabaseHealth = async () => {
  try {
    if (!pool) {
      return {
        status: 'disconnected',
        error: 'Database pool not initialized'
      };
    }
    
    // Test database connectivity with a simple query
    const result = await pool.query('SELECT version(), now() as current_time');
    const dbInfo = result.rows[0];
    
    return {
      status: 'connected',
      version: dbInfo.version,
      currentTime: dbInfo.current_time,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingConnections: pool.waitingCount
    };
  } catch (error) {
    logger.error('Database health check failed', {
      error: error.message
    });
    
    return {
      status: 'disconnected',
      error: error.message
    };
  }
};

// Startup validation for database connectivity
const validateDatabaseConnection = async () => {
  try {
    logger.info('Validating database connection on startup');
    
    const healthCheck = await checkDatabaseHealth();
    
    if (healthCheck.status !== 'connected') {
      throw new Error(`Database validation failed: ${healthCheck.error}`);
    }
    
    logger.info('Database startup validation successful', {
      version: healthCheck.version,
      connections: {
        total: healthCheck.totalConnections,
        idle: healthCheck.idleConnections,
        waiting: healthCheck.waitingConnections
      }
    });
    
    return true;
  } catch (error) {
    logger.error('Database startup validation failed', {
      error: error.message
    });
    throw error;
  }
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
};

module.exports = {
  connectDatabase,
  getPool,
  closeDatabase,
  checkDatabaseHealth,
  validateDatabaseConnection
};