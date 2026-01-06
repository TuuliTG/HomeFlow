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

const connectDatabase = async () => {
  try {
    const databaseUrl = process.env.NODE_ENV === 'test' 
      ? process.env.TEST_DATABASE_URL 
      : process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('Database URL not configured');
    }

    pool = createPool(databaseUrl);
    
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connected successfully');
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
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
  closeDatabase
};