/**
 * Property-Based Tests for Timeline Interactivity
 * Feature: daily-activity-tracker, Property 15: Timeline interactivity
 * 
 * Property 15: Timeline interactivity
 * For any timeline element clicked by an authorized user, the system should display detailed task information and provide appropriate status update options
 * Validates: Requirements 5.2
 */

const fc = require('fast-check');

// Mock timeline interaction handler
const handleTimelineElementClick = (task, user, onTaskClick) => {
  // Check if user is authorized to interact with the task
  const canUserInteract = (user, task) => {
    // MD and IT_Admin can interact with all tasks
    if (user.role === 'managing_director' || user.role === 'it_admin') {
      return true;
    }
    
    // Task creator can interact
    if (task.createdBy === user._id) {
      return true;
    }
    
    // Assigned user can interact
    if (task.assignedTo === user._id) {
      return true;
    }
    
    // Team leads can interact with their team's tasks
    if (user.role === 'team_lead' && task.teamId === user.teamId) {
      return true;
    }
    
    return false;
  };

  const isAuthorized = canUserInteract(user, task);
  
  if (isAuthorized && onTaskClick) {
    // Return interaction result with task details and available actions
    const availableActions = getAvailableActions(user, task);
    
    return {
      success: true,
      taskDetails: {
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo,
        scheduledDate: task.scheduledDate,
        dueDate: task.dueDate,
        createdBy: task.createdBy
      },
      availableActions,
      canEdit: canUserEditTask(user, task),
      canUpdateStatus: canUserUpdateStatus(user, task)
    };
  }
  
  return {
    success: false,
    error: isAuthorized ? 'No click handler provided' : 'Unauthorized access',
    taskDetails: null,
    availableActions: [],
    canEdit: false,
    canUpdateStatus: false
  };
};

// Helper function to get available actions based on user role and task
const getAvailableActions = (user, task) => {
  const actions = [];
  
  // View action is always available for authorized users
  actions.push('view');
  
  // Edit actions based on permissions
  if (canUserEditTask(user, task)) {
    actions.push('edit');
  }
  
  // Status update actions
  if (canUserUpdateStatus(user, task)) {
    actions.push('update_status');
    
    // Specific status transitions based on current status
    switch (task.status) {
      case 'new':
        actions.push('schedule', 'start');
        break;
      case 'scheduled':
        actions.push('start', 'cancel');
        break;
      case 'in_progress':
        actions.push('complete', 'pause');
        break;
      case 'completed':
        actions.push('reopen');
        break;
    }
  }
  
  // Delete action for admins and creators
  if (user.role === 'managing_director' || user.role === 'it_admin' || task.createdBy === user._id) {
    actions.push('delete');
  }
  
  return actions;
};

const canUserEditTask = (user, task) => {
  return user.role === 'managing_director' || 
         user.role === 'it_admin' || 
         task.createdBy === user._id ||
         (user.role === 'team_lead' && task.teamId === user.teamId);
};

const canUserUpdateStatus = (user, task) => {
  return user.role === 'managing_director' || 
         user.role === 'it_admin' || 
         task.createdBy === user._id ||
         task.assignedTo === user._id ||
         (user.role === 'team_lead' && task.teamId === user.teamId);
};

// Generators for test data
const roleArbitrary = fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee');
const statusArbitrary = fc.constantFrom('new', 'scheduled', 'in_progress', 'completed');
const priorityArbitrary = fc.constantFrom('low', 'medium', 'high', 'urgent');

const userArbitrary = fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  role: roleArbitrary,
  teamId: fc.string({ minLength: 24, maxLength: 24 }),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 })
});

const taskArbitrary = fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 0, maxLength: 1000 }),
  status: statusArbitrary,
  priority: priorityArbitrary,
  assignedTo: fc.option(fc.string({ minLength: 24, maxLength: 24 })),
  createdBy: fc.string({ minLength: 24, maxLength: 24 }),
  teamId: fc.string({ minLength: 24, maxLength: 24 }),
  scheduledDate: fc.option(fc.date()),
  dueDate: fc.option(fc.date())
});

describe('Property 15: Timeline Interactivity', () => {
  test('should display detailed task information for authorized users', () => {
    fc.assert(
      fc.property(
        taskArbitrary,
        userArbitrary,
        fc.boolean(),
        (task, user, hasClickHandler) => {
          const onTaskClick = hasClickHandler ? jest.fn() : null;
          const result = handleTimelineElementClick(task, user, onTaskClick);

          // Property: Result should always have required structure
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('taskDetails');
          expect(result).toHaveProperty('availableActions');
          expect(result).toHaveProperty('canEdit');
          expect(result).toHaveProperty('canUpdateStatus');

          // Property: Authorized users should get task details
          const isAuthorized = user.role === 'managing_director' || 
                              user.role === 'it_admin' ||
                              task.createdBy === user._id ||
                              task.assignedTo === user._id ||
                              (user.role === 'team_lead' && task.teamId === user.teamId);

          if (isAuthorized && hasClickHandler) {
            expect(result.success).toBe(true);
            expect(result.taskDetails).not.toBeNull();
            expect(result.taskDetails.id).toBe(task._id);
            expect(result.taskDetails.title).toBe(task.title);
            expect(result.taskDetails.status).toBe(task.status);
            expect(Array.isArray(result.availableActions)).toBe(true);
            expect(result.availableActions.length).toBeGreaterThan(0);
            expect(result.availableActions).toContain('view');
          } else {
            expect(result.success).toBe(false);
            expect(result.taskDetails).toBeNull();
            expect(result.availableActions).toEqual([]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should provide appropriate status update options based on current status', () => {
    fc.assert(
      fc.property(
        taskArbitrary,
        userArbitrary,
        (task, user) => {
          const result = handleTimelineElementClick(task, user, jest.fn());

          if (result.success && result.canUpdateStatus) {
            const actions = result.availableActions;

            // Property: Status-specific actions should be available
            switch (task.status) {
              case 'new':
                expect(actions).toContain('update_status');
                expect(actions.some(action => ['schedule', 'start'].includes(action))).toBe(true);
                break;
              case 'scheduled':
                expect(actions).toContain('update_status');
                expect(actions.some(action => ['start', 'cancel'].includes(action))).toBe(true);
                break;
              case 'in_progress':
                expect(actions).toContain('update_status');
                expect(actions.some(action => ['complete', 'pause'].includes(action))).toBe(true);
                break;
              case 'completed':
                expect(actions).toContain('update_status');
                expect(actions).toContain('reopen');
                break;
            }

            // Property: View action should always be available for successful interactions
            expect(actions).toContain('view');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should enforce role-based permissions correctly', () => {
    fc.assert(
      fc.property(
        taskArbitrary,
        userArbitrary,
        (task, user) => {
          const result = handleTimelineElementClick(task, user, jest.fn());

          // Property: MD and IT_Admin should always have full access
          if (user.role === 'managing_director' || user.role === 'it_admin') {
            expect(result.success).toBe(true);
            expect(result.canEdit).toBe(true);
            expect(result.canUpdateStatus).toBe(true);
            expect(result.availableActions).toContain('delete');
          }

          // Property: Task creator should have edit and update permissions
          if (task.createdBy === user._id) {
            expect(result.success).toBe(true);
            expect(result.canEdit).toBe(true);
            expect(result.canUpdateStatus).toBe(true);
            expect(result.availableActions).toContain('delete');
          }

          // Property: Assigned user should have status update permissions
          if (task.assignedTo === user._id) {
            expect(result.success).toBe(true);
            expect(result.canUpdateStatus).toBe(true);
          }

          // Property: Team lead should have permissions for their team's tasks
          if (user.role === 'team_lead' && task.teamId === user.teamId) {
            expect(result.success).toBe(true);
            expect(result.canEdit).toBe(true);
            expect(result.canUpdateStatus).toBe(true);
          }

          // Property: Unauthorized users should be denied access
          const isAuthorized = user.role === 'managing_director' || 
                              user.role === 'it_admin' ||
                              task.createdBy === user._id ||
                              task.assignedTo === user._id ||
                              (user.role === 'team_lead' && task.teamId === user.teamId);

          if (!isAuthorized) {
            expect(result.success).toBe(false);
            expect(result.canEdit).toBe(false);
            expect(result.canUpdateStatus).toBe(false);
            expect(result.availableActions).toEqual([]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle missing click handler gracefully', () => {
    fc.assert(
      fc.property(
        taskArbitrary,
        userArbitrary,
        (task, user) => {
          const result = handleTimelineElementClick(task, user, null);

          // Property: Missing click handler should result in failure even for authorized users
          const isAuthorized = user.role === 'managing_director' || 
                              user.role === 'it_admin' ||
                              task.createdBy === user._id ||
                              task.assignedTo === user._id ||
                              (user.role === 'team_lead' && task.teamId === user.teamId);

          if (isAuthorized) {
            expect(result.success).toBe(false);
            expect(result.error).toBe('No click handler provided');
          } else {
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized access');
          }

          // Property: No task details should be provided without handler
          expect(result.taskDetails).toBeNull();
          expect(result.availableActions).toEqual([]);
          expect(result.canEdit).toBe(false);
          expect(result.canUpdateStatus).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should maintain data integrity in task details', () => {
    fc.assert(
      fc.property(
        taskArbitrary,
        userArbitrary,
        (task, user) => {
          const result = handleTimelineElementClick(task, user, jest.fn());

          if (result.success && result.taskDetails) {
            // Property: Task details should preserve original task data
            expect(result.taskDetails.id).toBe(task._id);
            expect(result.taskDetails.title).toBe(task.title);
            expect(result.taskDetails.description).toBe(task.description);
            expect(result.taskDetails.status).toBe(task.status);
            expect(result.taskDetails.priority).toBe(task.priority);
            expect(result.taskDetails.assignedTo).toBe(task.assignedTo);
            expect(result.taskDetails.scheduledDate).toBe(task.scheduledDate);
            expect(result.taskDetails.dueDate).toBe(task.dueDate);
            expect(result.taskDetails.createdBy).toBe(task.createdBy);

            // Property: Task details should not contain sensitive internal data
            expect(result.taskDetails).not.toHaveProperty('__v');
            expect(result.taskDetails).not.toHaveProperty('updatedAt');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should provide consistent action availability', () => {
    fc.assert(
      fc.property(
        taskArbitrary,
        userArbitrary,
        (task, user) => {
          const result = handleTimelineElementClick(task, user, jest.fn());

          if (result.success) {
            // Property: Available actions should be consistent with permissions
            if (result.canEdit) {
              expect(result.availableActions).toContain('edit');
            } else {
              expect(result.availableActions).not.toContain('edit');
            }

            if (result.canUpdateStatus) {
              expect(result.availableActions).toContain('update_status');
            } else {
              expect(result.availableActions).not.toContain('update_status');
            }

            // Property: Actions should be unique (no duplicates)
            const uniqueActions = [...new Set(result.availableActions)];
            expect(uniqueActions.length).toBe(result.availableActions.length);

            // Property: Actions should be valid strings
            result.availableActions.forEach(action => {
              expect(typeof action).toBe('string');
              expect(action.length).toBeGreaterThan(0);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: daily-activity-tracker, Property 15: Timeline interactivity
 * Validates: Requirements 5.2
 */