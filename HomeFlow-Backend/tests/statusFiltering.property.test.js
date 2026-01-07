/**
 * Property-Based Test for Status Filtering
 * Feature: homeflow-task-backend, Property 15: Status Filtering
 * Validates: Requirements 5.1
 */

const fc = require('fast-check');
const TaskService = require('../src/services/TaskService');
const TaskModel = require('../src/models/TaskModel');
const { TaskStatus } = require('../src/models/Task');

// Mock the TaskModel to isolate the service layer logic
jest.mock('../src/models/TaskModel');

describe('Property 15: Status Filtering', () => {
  let taskService;
  let mockTaskModel;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create fresh instances
    mockTaskModel = new TaskModel();
    taskService = new TaskService();
    
    // Override the taskModel instance in TaskService
    taskService.taskModel = mockTaskModel;
  });

  /**
   * Property 15: Status Filtering
   * For any status filter parameter, the API should return only tasks matching that specific status
   * Validates: Requirements 5.1
   */
  test('Property 15: Status filtering returns only tasks with matching status', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a valid status value
        fc.constantFrom('available', 'allocated', 'completed'),
        // Generate an array of tasks with mixed statuses
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.option(fc.string({ maxLength: 500 })),
            category: fc.option(fc.constantFrom('Cleaning', 'Meta', 'Food', 'Other')),
            points: fc.option(fc.integer({ min: 1, max: 50 })),
            status: fc.constantFrom('available', 'allocated', 'completed'),
            assignedTo: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            createdAt: fc.date(),
            updatedAt: fc.date(),
            completedAt: fc.option(fc.date())
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (filterStatus, allTasks) => {
          // Clear mocks before each test iteration to prevent interference
          jest.clearAllMocks();
          
          // Mock the TaskModel.findAll method to return filtered tasks
          // This simulates the database filtering behavior
          const expectedFilteredTasks = allTasks.filter(task => task.status === filterStatus);
          mockTaskModel.findAll.mockResolvedValue(expectedFilteredTasks);

          // Call the service method with status filter
          const result = await taskService.getAllTasks({ status: filterStatus });

          // Verify that TaskModel.findAll was called with the correct filter
          expect(mockTaskModel.findAll).toHaveBeenCalledWith({ status: filterStatus });
          expect(mockTaskModel.findAll).toHaveBeenCalledTimes(1);

          // Property: All returned tasks must have the filtered status
          result.forEach(task => {
            expect(task.status).toBe(filterStatus);
          });

          // Property: The result should contain exactly the tasks with matching status
          expect(result).toHaveLength(expectedFilteredTasks.length);
          
          // Property: Each expected task should be in the result
          expectedFilteredTasks.forEach(expectedTask => {
            expect(result).toContainEqual(expectedTask);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 15 Edge Case: Empty task list with status filter returns empty array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('available', 'allocated', 'completed'),
        async (filterStatus) => {
          // Clear mocks before each test iteration
          jest.clearAllMocks();
          
          // Mock empty task list
          mockTaskModel.findAll.mockResolvedValue([]);

          // Call the service method with status filter
          const result = await taskService.getAllTasks({ status: filterStatus });

          // Verify correct filter was passed
          expect(mockTaskModel.findAll).toHaveBeenCalledWith({ status: filterStatus });
          expect(mockTaskModel.findAll).toHaveBeenCalledTimes(1);

          // Property: Empty list should remain empty regardless of filter
          expect(result).toEqual([]);
          expect(result).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 15 Edge Case: All tasks have same status returns all tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('available', 'allocated', 'completed'),
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constant('available') // All tasks have same status initially
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (filterStatus, baseTasks) => {
          // Clear mocks before each test iteration
          jest.clearAllMocks();
          
          // Set all tasks to have the filter status
          const allTasksWithSameStatus = baseTasks.map(task => ({
            ...task,
            status: filterStatus
          }));

          mockTaskModel.findAll.mockResolvedValue(allTasksWithSameStatus);

          // Call the service method with status filter
          const result = await taskService.getAllTasks({ status: filterStatus });

          // Verify correct filter was passed
          expect(mockTaskModel.findAll).toHaveBeenCalledWith({ status: filterStatus });
          expect(mockTaskModel.findAll).toHaveBeenCalledTimes(1);

          // Property: When all tasks match filter, all should be returned
          expect(result).toHaveLength(allTasksWithSameStatus.length);
          expect(result).toEqual(allTasksWithSameStatus);

          // Property: All returned tasks have the correct status
          result.forEach(task => {
            expect(task.status).toBe(filterStatus);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 15 Validation: Invalid status filter throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-empty invalid status strings (empty string is ignored, not invalid)
        fc.string({ minLength: 1 }).filter(s => !['available', 'allocated', 'completed'].includes(s)),
        async (invalidStatus) => {
          // Clear mocks before each test iteration
          jest.clearAllMocks();
          
          // The service should validate the filter and throw an error
          // before calling the model
          await expect(taskService.getAllTasks({ status: invalidStatus }))
            .rejects
            .toThrow('Invalid filters');

          // The model should not be called with invalid filters
          expect(mockTaskModel.findAll).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 15 Edge Case: Empty string status filter is ignored (treated as no filter)', async () => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Mock return value for no filters
    const allTasks = [
      { id: '1', status: 'available', title: 'Task 1' },
      { id: '2', status: 'allocated', title: 'Task 2' },
      { id: '3', status: 'completed', title: 'Task 3' }
    ];
    mockTaskModel.findAll.mockResolvedValue(allTasks);

    // Call with empty string status filter
    const result = await taskService.getAllTasks({ status: '' });

    // Empty string filter should be ignored, so findAll is called with empty string filter
    // (the service doesn't filter out empty values, it just doesn't validate them)
    expect(mockTaskModel.findAll).toHaveBeenCalledWith({ status: '' });
    expect(mockTaskModel.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(allTasks);
  });
});