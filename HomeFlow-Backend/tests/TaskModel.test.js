const TaskModel = require('../src/models/TaskModel');

describe('TaskModel', () => {
  let taskModel;

  beforeEach(() => {
    taskModel = new TaskModel();
  });

  describe('Class instantiation', () => {
    test('should create TaskModel instance', () => {
      expect(taskModel).toBeInstanceOf(TaskModel);
    });

    test('should have all required methods', () => {
      expect(typeof taskModel.findAll).toBe('function');
      expect(typeof taskModel.findById).toBe('function');
      expect(typeof taskModel.create).toBe('function');
      expect(typeof taskModel.update).toBe('function');
      expect(typeof taskModel.delete).toBe('function');
      expect(typeof taskModel.count).toBe('function');
      expect(typeof taskModel.exists).toBe('function');
      expect(typeof taskModel.findByStatus).toBe('function');
      expect(typeof taskModel.findByAssignedUser).toBe('function');
      expect(typeof taskModel.findDueBefore).toBe('function');
    });
  });

  describe('Method signatures', () => {
    test('findAll should accept optional filters parameter', () => {
      expect(taskModel.findAll.length).toBe(0); // Default parameter makes length 0
    });

    test('findById should accept id parameter', () => {
      expect(taskModel.findById.length).toBe(1);
    });

    test('create should accept taskData parameter', () => {
      expect(taskModel.create.length).toBe(1);
    });

    test('update should accept id and updateData parameters', () => {
      expect(taskModel.update.length).toBe(2);
    });

    test('delete should accept id parameter', () => {
      expect(taskModel.delete.length).toBe(1);
    });
  });
});