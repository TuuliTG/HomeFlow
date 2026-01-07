# Testing Infrastructure

This directory contains the testing infrastructure for the HomeFlow Backend API.

## Test Structure

### Test Types

1. **Unit Tests** (`tests/*.test.js`)
   - Test individual functions and classes in isolation
   - Use mocks for external dependencies
   - Fast execution, no database required

2. **Integration Tests** (`tests/integration/*.test.js`)
   - Test complete API endpoints with real database
   - Test full request/response cycles
   - Validate database interactions

3. **Property-Based Tests** (`tests/*.property.test.js`)
   - Test universal properties across many generated inputs
   - Use fast-check library for input generation
   - Validate correctness properties from design document

### Test Utilities

- **`testUtils.js`** - Database utilities for setup, cleanup, and mock data
- **`apiTestHelper.js`** - API testing utilities with Supertest integration
- **`setup.js`** - Global test configuration and database initialization

## Database Setup

### Test Database Configuration

The test suite uses a separate PostgreSQL database running in Docker:

- **Container**: `homeflow-postgres-test`
- **Database**: `homeflow_test`
- **Port**: `5434` (different from dev database on 5433)
- **Connection**: `postgresql://homeflow_user:homeflow_pass@127.0.0.1:5434/homeflow_test`

### Starting Test Database

```bash
# Start both dev and test databases
docker compose up -d

# Verify test database is running
docker compose ps
```

### Database Lifecycle

1. **Before All Tests**: Initialize connection and run migrations
2. **Before Each Test**: Clean all data from tables
3. **After All Tests**: Close database connections

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
```

## Test Environment Variables

The following environment variables are set automatically in test mode:

- `NODE_ENV=test`
- `TEST_DATABASE_URL=postgresql://homeflow_user:homeflow_pass@127.0.0.1:5434/homeflow_test`

## Writing Tests

### Unit Test Example

```javascript
const TaskService = require('../src/services/TaskService');

describe('TaskService', () => {
  test('should validate task data', () => {
    const taskService = new TaskService();
    const result = taskService.validateTask({ title: 'Test' });
    expect(result.isValid).toBe(true);
  });
});
```

### Integration Test Example

```javascript
const ApiTestHelper = require('../apiTestHelper');

describe('Task API', () => {
  let apiHelper;

  beforeAll(() => {
    apiHelper = new ApiTestHelper();
  });

  test('should create task via API', async () => {
    const response = await apiHelper.createTask({ title: 'Test Task' });
    expect(response.body.success).toBe(true);
  });
});
```

### Property-Based Test Example

```javascript
const fc = require('fast-check');

test('Property: Task creation preserves title', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 255 }),
      async (title) => {
        const task = await createTask({ title });
        expect(task.title).toBe(title);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Troubleshooting

### Database Connection Issues

1. Ensure Docker containers are running:
   ```bash
   docker compose ps
   ```

2. Check database logs:
   ```bash
   docker compose logs postgres-test
   ```

3. Verify database connectivity:
   ```bash
   docker exec -it homeflow-postgres-test psql -U homeflow_user -d homeflow_test -c "SELECT 1;"
   ```

### Test Failures

1. **Database not ready**: Increase timeout in `testUtils.waitForDatabase()`
2. **Port conflicts**: Ensure port 5434 is available
3. **Migration issues**: Check migration files and database schema

### Performance Issues

1. **Slow tests**: Consider using test database transactions for faster cleanup
2. **Memory usage**: Ensure database connections are properly closed
3. **Parallel execution**: Be careful with shared test database state

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean test data between tests
3. **Mocking**: Use mocks for unit tests, real database for integration tests
4. **Assertions**: Use descriptive assertions and error messages
5. **Coverage**: Aim for high test coverage but focus on critical paths
6. **Performance**: Keep tests fast and reliable