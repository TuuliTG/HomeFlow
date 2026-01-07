// Test setup file
require('dotenv').config({ path: '.env' });

const TestUtils = require('./testUtils');
const { connectDatabase, closeDatabase } = require('../src/config/database');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = 'postgresql://homeflow_user:homeflow_pass@127.0.0.1:5434/homeflow_test';

// Global test utilities instance
global.testUtils = new TestUtils();

// Global test setup
beforeAll(async () => {
  // Wait for test database to be ready
  await global.testUtils.waitForDatabase();
  
  // Connect to the database using the main database config
  await connectDatabase();
  
  // Run migrations to ensure schema is up to date
  await global.testUtils.runMigrations();
}, 30000); // 30 second timeout for database setup

afterAll(async () => {
  // Close database connections
  await closeDatabase();
  await global.testUtils.closeTestDatabase();
});

// Clean database before each test file
beforeEach(async () => {
  // Clean all test data
  await global.testUtils.cleanDatabase();
});