/**
 * Integration Tests for Task API Endpoints
 * Tests the complete HTTP request/response cycle with real database
 */

const ApiTestHelper = require('../apiTestHelper');

describe('Task API Integration Tests', () => {
  let apiHelper;

  beforeAll(() => {
    apiHelper = new ApiTestHelper();
  });

  beforeEach(async () => {
    // Ensure clean state before each test
    await global.testUtils.cleanDatabase();
  });

  afterAll(() => {
    apiHelper.cleanup();
  });

  describe('Health Check Endpoint', () => {
    test('GET /api/health should return system status', async () => {
      const response = await apiHelper.get('/api/health');
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Task CRUD Operations', () => {
    test('POST /api/tasks should create a new task', async () => {
      const taskData = {
        title: 'Integration Test Task',
        description: 'Created in integration test',
        category: 'Cleaning',
        points: 15
      };

      const response = await apiHelper.post('/api/tasks', taskData, 201);
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      
      const createdTask = response.body.data;
      apiHelper.assertTaskStructure(createdTask);
      expect(createdTask.title).toBe(taskData.title);
      expect(createdTask.description).toBe(taskData.description);
      expect(createdTask.category).toBe(taskData.category);
      expect(createdTask.points).toBe(taskData.points);
      expect(createdTask.status).toBe('available');
    });

    test('GET /api/tasks should return all tasks', async () => {
      // Create test tasks
      await apiHelper.createTasks(3);

      const response = await apiHelper.get('/api/tasks');
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);

      // Verify each task structure
      response.body.data.forEach(task => {
        apiHelper.assertTaskStructure(task);
      });
    });

    test('GET /api/tasks/:id should return specific task', async () => {
      // Create a test task
      const createResponse = await apiHelper.createTask();
      const taskId = createResponse.body.data.id;

      const response = await apiHelper.get(`/api/tasks/${taskId}`);
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      
      const task = response.body.data;
      apiHelper.assertTaskStructure(task);
      expect(task.id).toBe(taskId);
    });

    test('PUT /api/tasks/:id should update task', async () => {
      // Create a test task
      const createResponse = await apiHelper.createTask();
      const taskId = createResponse.body.data.id;

      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description',
        points: 25
      };

      const response = await apiHelper.put(`/api/tasks/${taskId}`, updateData);
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      
      const updatedTask = response.body.data;
      expect(updatedTask.title).toBe(updateData.title);
      expect(updatedTask.description).toBe(updateData.description);
      expect(updatedTask.points).toBe(updateData.points);
      expect(new Date(updatedTask.updatedAt)).toBeInstanceOf(Date);
    });

    test('DELETE /api/tasks/:id should delete available task', async () => {
      // Create a test task
      const createResponse = await apiHelper.createTask();
      const taskId = createResponse.body.data.id;

      const response = await apiHelper.delete(`/api/tasks/${taskId}`);
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);

      // Verify task is deleted
      const getResponse = await apiHelper.get(`/api/tasks/${taskId}`, 404);
      expect(getResponse.body.success).toBe(false);
    });
  });

  describe('Task Status Operations', () => {
    test('PATCH /api/tasks/:id/claim should claim available task', async () => {
      // Create an available task
      const createResponse = await apiHelper.createTask();
      const taskId = createResponse.body.data.id;

      const claimData = { userId: 'test-user-123' };
      const response = await apiHelper.patch(`/api/tasks/${taskId}/claim`, claimData);
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      
      const claimedTask = response.body.data;
      expect(claimedTask.status).toBe('allocated');
      expect(claimedTask.assignedTo).toBe(claimData.userId);
    });

    test('PATCH /api/tasks/:id/complete should complete allocated task', async () => {
      // Create and claim a task
      const createResponse = await apiHelper.createTask();
      const taskId = createResponse.body.data.id;
      
      const userId = 'test-user-123';
      await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId });

      const response = await apiHelper.patch(`/api/tasks/${taskId}/complete`, { userId });
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      
      const completedTask = response.body.data;
      expect(completedTask.status).toBe('completed');
      expect(completedTask.completedAt).toBeTruthy();
    });

    test('PATCH /api/tasks/:id/unclaim should unclaim allocated task', async () => {
      // Create and claim a task
      const createResponse = await apiHelper.createTask();
      const taskId = createResponse.body.data.id;
      
      const userId = 'test-user-123';
      await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId });

      const response = await apiHelper.patch(`/api/tasks/${taskId}/unclaim`, { userId });
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      
      const unclaimedTask = response.body.data;
      expect(unclaimedTask.status).toBe('available');
      expect(unclaimedTask.assignedTo).toBeNull();
    });
  });

  describe('Task Filtering', () => {
    test('GET /api/tasks?status=available should filter by status', async () => {
      // Create tasks with different statuses
      const task1 = await apiHelper.createTask({ title: 'Available Task' });
      const task2 = await apiHelper.createTask({ title: 'To Be Claimed' });
      
      // Claim one task
      const taskId = task2.body.data.id;
      await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId: 'test-user' });

      const response = await apiHelper.get('/api/tasks?status=available');
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('available');
      expect(response.body.data[0].title).toBe('Available Task');
    });

    test('GET /api/tasks?category=Cleaning should filter by category', async () => {
      // Create tasks with different categories
      await apiHelper.createTask({ title: 'Cleaning Task', category: 'Cleaning' });
      await apiHelper.createTask({ title: 'Food Task', category: 'Food' });

      const response = await apiHelper.get('/api/tasks?category=Cleaning');
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].category).toBe('Cleaning');
      expect(response.body.data[0].title).toBe('Cleaning Task');
    });

    test('GET /api/tasks?assignedTo=user1 should filter by assigned user', async () => {
      // Create tasks and assign one
      await apiHelper.createTask({ title: 'Unassigned Task' });
      const task2 = await apiHelper.createTask({ title: 'Assigned Task' });
      
      const taskId = task2.body.data.id;
      await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId: 'user1' });

      const response = await apiHelper.get('/api/tasks?assignedTo=user1');
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].assignedTo).toBe('user1');
      expect(response.body.data[0].title).toBe('Assigned Task');
    });

    test('GET /api/tasks with multiple filters should return matching tasks', async () => {
      // Create various tasks
      await apiHelper.createTask({ title: 'Cleaning Available', category: 'Cleaning' });
      await apiHelper.createTask({ title: 'Food Available', category: 'Food' });
      const task3 = await apiHelper.createTask({ title: 'Cleaning Allocated', category: 'Cleaning' });
      
      // Claim one cleaning task
      const taskId = task3.body.data.id;
      await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId: 'test-user' });

      // Filter by category=Cleaning AND status=available
      const response = await apiHelper.get('/api/tasks?category=Cleaning&status=available');
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].category).toBe('Cleaning');
      expect(response.body.data[0].status).toBe('available');
      expect(response.body.data[0].title).toBe('Cleaning Available');
    });

    test('GET /api/tasks?points=15 should filter by points', async () => {
      // Create tasks with different point values
      await apiHelper.createTask({ title: 'Low Points', points: 5 });
      await apiHelper.createTask({ title: 'High Points', points: 15 });

      const response = await apiHelper.get('/api/tasks?points=15');
      
      apiHelper.assertApiResponse(response);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].points).toBe(15);
      expect(response.body.data[0].title).toBe('High Points');
    });
  });

  describe('Error Handling and Constraint Violations', () => {
    describe('Input Validation Errors', () => {
      test('POST /api/tasks with empty title should return validation error', async () => {
        const invalidTask = {
          title: '', // Empty title should be invalid
          description: 'Valid description',
          category: 'Cleaning',
          points: 10
        };

        const response = await apiHelper.post('/api/tasks', invalidTask, 400);
        
        apiHelper.assertValidationError(response);
        expect(response.body.error).toBe('VALIDATION_ERROR');
        // Check that it's a validation error, don't rely on specific message content
        expect(response.body.message).toBeTruthy();
      });

      test('POST /api/tasks with points over 50 should return validation error', async () => {
        const invalidTask = {
          title: 'Valid Title',
          description: 'Valid description',
          category: 'Cleaning',
          points: 100 // Points over 50 should be invalid
        };

        const response = await apiHelper.post('/api/tasks', invalidTask, 400);
        
        apiHelper.assertValidationError(response);
        expect(response.body.message).toBeTruthy();
      });

      test('POST /api/tasks with invalid category should return validation error', async () => {
        const invalidTask = {
          title: 'Valid Title',
          description: 'Valid description',
          category: 'InvalidCategory', // Invalid category
          points: 10
        };

        const response = await apiHelper.post('/api/tasks', invalidTask, 400);
        
        apiHelper.assertValidationError(response);
        expect(response.body.message).toBeTruthy();
      });

      test('POST /api/tasks with invalid due date should return validation error', async () => {
        const invalidTask = {
          title: 'Valid Title',
          description: 'Valid description',
          category: 'Cleaning',
          points: 10,
          dueDate: '2020-01-01' // Past date should be invalid
        };

        const response = await apiHelper.post('/api/tasks', invalidTask, 400);
        
        apiHelper.assertValidationError(response);
        expect(response.body.message).toBeTruthy();
      });

      test('POST /api/tasks with malformed JSON should return 400', async () => {
        const response = await apiHelper.getRequest()
          .post('/api/tasks')
          .send('invalid json')
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
    });

    describe('Resource Not Found Errors', () => {
      test('GET /api/tasks/:id with invalid UUID format should return 400', async () => {
        const invalidId = 'invalid-uuid';
        const response = await apiHelper.get(`/api/tasks/${invalidId}`, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('GET /api/tasks/:id with valid UUID but non-existent task should return 404', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await apiHelper.get(`/api/tasks/${nonExistentId}`, 404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('TASK_NOT_FOUND');
      });

      test('PUT /api/tasks/:id with non-existent task should return 404', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const updateData = { title: 'Updated Title' };
        
        const response = await apiHelper.put(`/api/tasks/${nonExistentId}`, updateData, 404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('NOT_FOUND');
      });

      test('DELETE /api/tasks/:id with non-existent task should return 404', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await apiHelper.delete(`/api/tasks/${nonExistentId}`, 404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('NOT_FOUND');
      });
    });

    describe('Status Operation Errors', () => {
      test('PATCH /api/tasks/:id/claim without userId should return 400', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;

        const response = await apiHelper.patch(`/api/tasks/${taskId}/claim`, {}, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('MISSING_USER_ID');
      });

      test('PATCH /api/tasks/:id/claim non-existent task should return 404', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await apiHelper.patch(`/api/tasks/${nonExistentId}/claim`, 
          { userId: 'test-user' }, 404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('NOT_FOUND');
      });

      test('PATCH /api/tasks/:id/claim already allocated task should return 400', async () => {
        // Create and claim a task
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;
        await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId: 'user1' });

        // Try to claim again with different user
        const response = await apiHelper.patch(`/api/tasks/${taskId}/claim`, 
          { userId: 'user2' }, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('PATCH /api/tasks/:id/complete without userId should return 400', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;

        const response = await apiHelper.patch(`/api/tasks/${taskId}/complete`, {}, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('MISSING_USER_ID');
      });

      test('PATCH /api/tasks/:id/complete available task should return 400', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;

        const response = await apiHelper.patch(`/api/tasks/${taskId}/complete`, 
          { userId: 'test-user' }, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('PATCH /api/tasks/:id/complete by wrong user should return 400', async () => {
        // Create and claim task with user1
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;
        await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId: 'user1' });

        // Try to complete with user2
        const response = await apiHelper.patch(`/api/tasks/${taskId}/complete`, 
          { userId: 'user2' }, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('PATCH /api/tasks/:id/unclaim available task should return 400', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;

        const response = await apiHelper.patch(`/api/tasks/${taskId}/unclaim`, 
          { userId: 'test-user' }, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('Filter Parameter Validation', () => {
      test('GET /api/tasks with invalid status filter should return 400', async () => {
        const response = await apiHelper.get('/api/tasks?status=invalid_status', 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('GET /api/tasks with invalid category filter should return 400', async () => {
        const response = await apiHelper.get('/api/tasks?category=InvalidCategory', 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('GET /api/tasks with invalid points filter should return 400', async () => {
        const response = await apiHelper.get('/api/tasks?points=invalid', 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_FILTER_PARAMETERS');
      });

      test('GET /api/tasks with empty filter values should return 400', async () => {
        // Test with whitespace-only status filter
        const response1 = await apiHelper.get('/api/tasks?status=%20', 400);
        expect(response1.body.success).toBe(false);
      });
    });

    describe('Business Rule Violations', () => {
      test('DELETE allocated task should return 400', async () => {
        // Create and claim a task
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;
        await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId: 'test-user' });

        // Try to delete allocated task
        const response = await apiHelper.delete(`/api/tasks/${taskId}`, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('DELETE completed task should return 400', async () => {
        // Create, claim, and complete a task
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;
        const userId = 'test-user';
        await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId });
        await apiHelper.patch(`/api/tasks/${taskId}/complete`, { userId });

        // Try to delete completed task
        const response = await apiHelper.delete(`/api/tasks/${taskId}`, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('PUT task with invalid status transition should return 400', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;

        // Try to directly set status to completed (should go through allocated first)
        const response = await apiHelper.put(`/api/tasks/${taskId}`, 
          { status: 'completed' }, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Database Constraint Violations and Edge Cases', () => {
    describe('Timestamp Handling', () => {
      test('Task creation should set createdAt and updatedAt timestamps', async () => {
        const beforeCreate = new Date();
        const response = await apiHelper.createTask();
        const afterCreate = new Date();
        
        const task = response.body.data;
        const createdAt = new Date(task.createdAt);
        const updatedAt = new Date(task.updatedAt);
        
        expect(createdAt).toBeInstanceOf(Date);
        expect(updatedAt).toBeInstanceOf(Date);
        expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
        expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        expect(updatedAt.getTime()).toEqual(createdAt.getTime());
        expect(task.completedAt).toBeNull();
      });

      test('Task update should modify updatedAt timestamp', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;
        const originalUpdatedAt = new Date(createResponse.body.data.updatedAt);
        
        // Wait a moment to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const updateResponse = await apiHelper.put(`/api/tasks/${taskId}`, 
          { title: 'Updated Title' });
        
        const updatedTask = updateResponse.body.data;
        const newUpdatedAt = new Date(updatedTask.updatedAt);
        
        expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        expect(updatedTask.completedAt).toBeNull();
      });

      test('Task completion should set completedAt timestamp', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;
        const userId = 'test-user';
        
        // Claim and complete the task
        await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId });
        
        const beforeComplete = new Date();
        const completeResponse = await apiHelper.patch(`/api/tasks/${taskId}/complete`, { userId });
        const afterComplete = new Date();
        
        const completedTask = completeResponse.body.data;
        const completedAt = new Date(completedTask.completedAt);
        
        expect(completedAt).toBeInstanceOf(Date);
        expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
        expect(completedAt.getTime()).toBeLessThanOrEqual(afterComplete.getTime());
        expect(completedTask.status).toBe('completed');
      });
    });

    describe('Data Integrity and Constraints', () => {
      test('Task with extremely long title should be truncated or rejected', async () => {
        const longTitle = 'A'.repeat(300); // Longer than 255 character limit
        const taskData = {
          title: longTitle,
          description: 'Valid description',
          category: 'Cleaning',
          points: 10
        };

        const response = await apiHelper.post('/api/tasks', taskData, 400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('Task with boundary point values should be handled correctly', async () => {
        // Test minimum valid points
        const minPointsTask = await apiHelper.createTask({ 
          title: 'Min Points Task', 
          points: 1 
        });
        expect(minPointsTask.body.data.points).toBe(1);

        // Test maximum valid points
        const maxPointsTask = await apiHelper.createTask({ 
          title: 'Max Points Task', 
          points: 50 
        });
        expect(maxPointsTask.body.data.points).toBe(50);

        // Test zero points (should be invalid)
        const zeroPointsResponse = await apiHelper.post('/api/tasks', {
          title: 'Zero Points Task',
          points: 0
        }, 400);
        expect(zeroPointsResponse.body.success).toBe(false);

        // Test negative points (should be invalid)
        const negativePointsResponse = await apiHelper.post('/api/tasks', {
          title: 'Negative Points Task',
          points: -5
        }, 400);
        expect(negativePointsResponse.body.success).toBe(false);
      });

      test('Task with null/undefined optional fields should be handled correctly', async () => {
        const taskData = {
          title: 'Minimal Task',
          description: null,
          category: null,
          points: null,
          dueDate: null
        };

        const response = await apiHelper.createTask(taskData);
        
        const task = response.body.data;
        expect(task.title).toBe('Minimal Task');
        expect(task.description).toBeNull();
        expect(task.category).toBeNull();
        expect(task.points).toBeNull();
        expect(task.dueDate).toBeNull();
        expect(task.status).toBe('available');
      });
    });

    describe('Concurrent Operations', () => {
      test('Multiple users claiming same task should result in only one success', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;

        // Create promises that handle both success and failure cases
        const claimPromises = [
          apiHelper.getRequest().patch(`/api/tasks/${taskId}/claim`).send({ userId: 'user1' }),
          apiHelper.getRequest().patch(`/api/tasks/${taskId}/claim`).send({ userId: 'user2' }),
          apiHelper.getRequest().patch(`/api/tasks/${taskId}/claim`).send({ userId: 'user3' })
        ];

        const results = await Promise.allSettled(claimPromises);
        
        // Count successful and failed attempts
        let successCount = 0;
        let failureCount = 0;
        
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value.status === 200) {
              successCount++;
            } else if (result.value.status === 400) {
              failureCount++;
            }
          }
        });

        // Only one should succeed, others should fail
        expect(successCount).toBe(1);
        expect(failureCount).toBe(2);
        
        // Verify final state - task should be allocated to exactly one user
        const finalTask = await apiHelper.get(`/api/tasks/${taskId}`);
        expect(finalTask.body.data.status).toBe('allocated');
        expect(finalTask.body.data.assignedTo).toMatch(/^user[123]$/);
      });

      test('Rapid status changes should maintain data consistency', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;
        const userId = 'test-user';

        // Claim task
        const claimResponse = await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId });
        expect(claimResponse.body.data.status).toBe('allocated');
        expect(claimResponse.body.data.assignedTo).toBe(userId);

        // Unclaim task
        const unclaimResponse = await apiHelper.patch(`/api/tasks/${taskId}/unclaim`, { userId });
        expect(unclaimResponse.body.data.status).toBe('available');
        expect(unclaimResponse.body.data.assignedTo).toBeNull();

        // Claim again
        const reclaimResponse = await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId });
        expect(reclaimResponse.body.data.status).toBe('allocated');
        expect(reclaimResponse.body.data.assignedTo).toBe(userId);

        // Complete task
        const completeResponse = await apiHelper.patch(`/api/tasks/${taskId}/complete`, { userId });
        expect(completeResponse.body.data.status).toBe('completed');
        expect(completeResponse.body.data.assignedTo).toBe(userId);
        expect(completeResponse.body.data.completedAt).toBeTruthy();
      });
    });

    describe('Large Dataset Handling', () => {
      test('API should handle large number of tasks efficiently', async () => {
        // Create multiple tasks
        const taskCount = 20;
        const createPromises = [];
        
        for (let i = 0; i < taskCount; i++) {
          createPromises.push(apiHelper.createTask({ 
            title: `Bulk Task ${i + 1}`,
            category: i % 2 === 0 ? 'Cleaning' : 'Food',
            points: (i % 10) + 1
          }));
        }

        await Promise.all(createPromises);

        // Retrieve all tasks
        const response = await apiHelper.get('/api/tasks');
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(taskCount);
        expect(response.body.count).toBe(taskCount);
      });

      test('Filtering should work correctly with large datasets', async () => {
        // Create tasks with specific patterns
        const cleaningTasks = 10;
        const foodTasks = 5;
        
        // Create cleaning tasks
        for (let i = 0; i < cleaningTasks; i++) {
          await apiHelper.createTask({ 
            title: `Cleaning Task ${i + 1}`,
            category: 'Cleaning'
          });
        }
        
        // Create food tasks
        for (let i = 0; i < foodTasks; i++) {
          await apiHelper.createTask({ 
            title: `Food Task ${i + 1}`,
            category: 'Food'
          });
        }

        // Test filtering
        const cleaningResponse = await apiHelper.get('/api/tasks?category=Cleaning');
        expect(cleaningResponse.body.data.length).toBe(cleaningTasks);

        const foodResponse = await apiHelper.get('/api/tasks?category=Food');
        expect(foodResponse.body.data.length).toBe(foodTasks);
      });
    });

    describe('API Response Format Consistency', () => {
      test('All successful responses should have consistent structure', async () => {
        const createResponse = await apiHelper.createTask();
        const taskId = createResponse.body.data.id;

        // Test different endpoints for consistent response format
        const responses = [
          await apiHelper.get('/api/tasks'),
          await apiHelper.get(`/api/tasks/${taskId}`),
          await apiHelper.put(`/api/tasks/${taskId}`, { title: 'Updated' }),
          await apiHelper.patch(`/api/tasks/${taskId}/claim`, { userId: 'test-user' })
        ];

        responses.forEach(response => {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('requestId');
          expect(typeof response.body.timestamp).toBe('string');
          expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
        });
      });

      test('All error responses should have consistent structure', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        
        const errorResponses = [
          await apiHelper.get(`/api/tasks/${nonExistentId}`, 404),
          await apiHelper.post('/api/tasks', { title: '' }, 400),
          await apiHelper.get('/api/tasks?status=invalid', 400)
        ];

        errorResponses.forEach(response => {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('requestId');
          expect(typeof response.body.timestamp).toBe('string');
          expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
        });
      });
    });
  });
});