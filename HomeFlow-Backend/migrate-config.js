require('dotenv').config();

module.exports = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://homeflow_user:homeflow_pass@127.0.0.1:5433/homeflow_dev',
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  direction: 'up',
  count: Infinity,
  ignorePattern: '.*\\..*',
  schema: 'public',
  createSchema: false,
  createMigrationsSchema: false
};