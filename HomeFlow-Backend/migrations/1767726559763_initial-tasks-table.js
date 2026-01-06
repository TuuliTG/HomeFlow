/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable UUID extension
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
  
  // Create tasks table
  pgm.createTable('tasks', {
    id: { 
      type: 'uuid', 
      primaryKey: true, 
      default: pgm.func('uuid_generate_v4()') 
    },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    due_date: { type: 'timestamptz' },
    category: { 
      type: 'varchar(50)', 
      check: "category IN ('Cleaning', 'Meta', 'Food', 'Other')" 
    },
    points: { 
      type: 'integer', 
      check: 'points >= 1 AND points <= 50' 
    },
    status: { 
      type: 'varchar(20)', 
      notNull: true, 
      default: 'available',
      check: "status IN ('available', 'allocated', 'completed')" 
    },
    assigned_to: { type: 'varchar(100)' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    completed_at: { type: 'timestamptz' }
  });
  
  // Add constraints for business rules
  pgm.addConstraint('tasks', 'valid_due_date', 
    'CHECK (due_date IS NULL OR due_date > NOW())');
  pgm.addConstraint('tasks', 'completed_task_has_timestamp', 
    'CHECK ((status = \'completed\' AND completed_at IS NOT NULL) OR (status != \'completed\' AND completed_at IS NULL))');
  pgm.addConstraint('tasks', 'allocated_task_has_assignee', 
    'CHECK ((status = \'allocated\' AND assigned_to IS NOT NULL) OR (status != \'allocated\'))');
  
  // Create performance indexes
  pgm.createIndex('tasks', 'status');
  pgm.createIndex('tasks', 'category');
  pgm.createIndex('tasks', 'assigned_to');
  pgm.createIndex('tasks', 'due_date');
  pgm.createIndex('tasks', 'created_at');
  
  // Create composite indexes for common queries
  pgm.createIndex('tasks', ['status', 'category']);
  pgm.createIndex('tasks', ['status', 'assigned_to']);
};

exports.down = (pgm) => {
  pgm.dropTable('tasks');
  pgm.dropExtension('uuid-ossp');
};
