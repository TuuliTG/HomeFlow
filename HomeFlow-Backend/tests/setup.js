// Test setup file
require('dotenv').config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  // Database setup will be added here
});

afterAll(async () => {
  // Database cleanup will be added here
});