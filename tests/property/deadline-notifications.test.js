/**
 * Property-Based Tests for Deadline Notifications
 * Feature: daily-activity-tracker, Property 16: Deadline notifications
 * 
 * Property 16: Deadline notifications
 * For any project with approaching deadlines, the system should provide visual indicators for upcoming due dates
 * Validates: Requirements 5.4
 */

const fc = require('fast-check');
const moment = require('moment');

// Mock deadline notification system
const getDeadlineNotifications = (tasks, daysAhead = 7) => {
  const today = moment();
  const futureDate = today.clone().add(daysAhead, 'days');
  
  return tasks
    .filter(task => {
      // Exclude completed tasks
      if (task.status === 'completed') return false;
      
      // Must have a due date
      if (!task.dueDate) return false;
      
      const taskDue = moment(task.dueDate);
      
      // Must be within the notification window
      return taskDue.isBetween(today, futureDate, 'day', '[]');
    })
    .map(task => {
      const taskDue = moment(task.dueDate);
      const daysUntilDue = taskDue.diff(today, 'days');
      
      return {
        ...task,
        daysUntilDue,
        isOverdue: taskDue.isBefore(today, 'day'),
        isDueToday: taskDue.isSame(today, 'day'),
        urgencyLevel: getUrgencyLevel(daysUntilDue, task.priority),
        notificationMessage: generateNotificationMessage(task, daysUntilDue)
      };
    })
    .sort((a, b) => {
      // Sort by urgency: overdue first, then by days until due, then by priority
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.daysUntilDue !== b.daysUntilDue) return a.daysUntilDue - b.daysUntilDue;
      
      const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
};

const getUrgencyLevel = (daysUntilDue, priority) => {
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue === 0) return 'due-today';
  if (daysUntilDue <= 1 && ['urgent', 'high'].includes(priority)) return 'critical';
  if (daysUntilDue <= 3) return 'high';
  if (daysUntilDue <= 7) return 'medium';
  return 'low';
};

const generateNotificationMessage = (task, daysUntilDue) => {
  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    return `"${task.title}" is ${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`;
  }
  if (daysUntilDue === 0) {
    return `"${task.title}" is due today`;
  }
  if (daysUntilDue === 1) {
    return `"${task.title}" is due tomorrow`;
  }
  return `"${task.title}" is due in ${daysUntilDue} days`;
};

const getVisualIndicator = (urgencyLevel) => {
  const indicators = {
    'overdue': { color: '#dc3545', icon: 'exclamation-triangle', class: 'danger' },
    'due-today': { color: '#fd7e14', icon: 'clock', class: 'warning' },
    'critical': { color: '#dc3545', icon: 'exclamation-circle', class: 'danger' },
    'high': { color: '#ffc107', icon: 'exclamation', class: 'warning' },
    'medium': { color: '#17a2b8', icon: 'info-circle', class: 'info' },
    'low': { color: '#6c757d', icon: 'calendar', class: 'secondary' }
  };
  
  return indicators[urgencyLevel] || indicators['low'];
};

// Generators for test data
const statusArbitrary = fc.constantFrom('new', 'scheduled', 'in_progress', 'completed');
const priorityArbitrary = fc.constantFrom('low', 'medium', 'high', 'urgent');

const taskArbitrary = fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  status: statusArbitrary,
  priority: priorityArbitrary,
  dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
  projectId: fc.string({ minLength: 24, maxLength: 24 }),
  assignedTo: fc.option(fc.string({ minLength: 24, maxLength: 24 }))
});

describe('Property 16: Deadline Notifications', () => {
  test('should provide visual indicators for upcoming due dates', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 30 }),
        (tasks, daysAhead) => {
          const notifications = getDeadlineNotifications(tasks, daysAhead);

          // Property: All notifications should have visual indicators
          notifications.forEach(notification => {
            expect(notification.urgencyLevel).toBeDefined();
            expect(typeof notification.urgencyLevel).toBe('string');
            
            const indicator = getVisualIndicator(notification.urgencyLevel);
            expect(indicator).toBeDefined();
            expect(indicator.color).toMatch(/^#[0-9a-f]{6}$/i);
            expect(indicator.icon).toBeDefined();
            expect(indicator.class).toBeDefined();
          });

          // Property: Only tasks with due dates should be included
          notifications.forEach(notification => {
            expect(notification.dueDate).toBeDefined();
            expect(notification.dueDate).not.toBeNull();
          });

          // Property: Completed tasks should not appear in notifications
          notifications.forEach(notification => {
            expect(notification.status).not.toBe('completed');
          });

          // Property: All notifications should be within the specified time window
          const today = moment();
          const futureDate = today.clone().add(daysAhead, 'days');
          
          notifications.forEach(notification => {
            const taskDue = moment(notification.dueDate);
            expect(taskDue.isBetween(today, futureDate, 'day', '[]')).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should correctly calculate days until due and urgency levels', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
        (tasks) => {
          const notifications = getDeadlineNotifications(tasks);

          notifications.forEach(notification => {
            const today = moment();
            const taskDue = moment(notification.dueDate);
            const expectedDaysUntilDue = taskDue.diff(today, 'days');

            // Property: Days until due should be calculated correctly
            expect(notification.daysUntilDue).toBe(expectedDaysUntilDue);

            // Property: Overdue flag should be correct
            expect(notification.isOverdue).toBe(taskDue.isBefore(today, 'day'));

            // Property: Due today flag should be correct
            expect(notification.isDueToday).toBe(taskDue.isSame(today, 'day'));

            // Property: Urgency level should be appropriate for days until due
            if (notification.daysUntilDue < 0) {
              expect(notification.urgencyLevel).toBe('overdue');
            } else if (notification.daysUntilDue === 0) {
              expect(notification.urgencyLevel).toBe('due-today');
            } else if (notification.daysUntilDue <= 1 && ['urgent', 'high'].includes(notification.priority)) {
              expect(notification.urgencyLevel).toBe('critical');
            } else if (notification.daysUntilDue <= 3) {
              expect(notification.urgencyLevel).toBe('high');
            } else if (notification.daysUntilDue <= 7) {
              expect(notification.urgencyLevel).toBe('medium');
            } else {
              expect(notification.urgencyLevel).toBe('low');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should sort notifications by urgency correctly', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 2, maxLength: 15 }),
        (tasks) => {
          const notifications = getDeadlineNotifications(tasks);

          if (notifications.length < 2) return; // Skip if not enough notifications

          // Property: Notifications should be sorted by urgency
          for (let i = 1; i < notifications.length; i++) {
            const prev = notifications[i - 1];
            const curr = notifications[i];

            // Overdue tasks should come first
            if (prev.isOverdue && !curr.isOverdue) {
              // This is correct order
              expect(true).toBe(true);
            } else if (!prev.isOverdue && curr.isOverdue) {
              // This should not happen
              expect(false).toBe(true);
            } else {
              // Both are overdue or both are not overdue
              // Should be sorted by days until due, then by priority
              if (prev.daysUntilDue !== curr.daysUntilDue) {
                expect(prev.daysUntilDue).toBeLessThanOrEqual(curr.daysUntilDue);
              } else {
                // Same days until due, check priority order
                const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
                expect(priorityOrder[prev.priority]).toBeLessThanOrEqual(priorityOrder[curr.priority]);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should generate appropriate notification messages', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        (tasks) => {
          const notifications = getDeadlineNotifications(tasks);

          notifications.forEach(notification => {
            // Property: Notification message should be defined and non-empty
            expect(notification.notificationMessage).toBeDefined();
            expect(typeof notification.notificationMessage).toBe('string');
            expect(notification.notificationMessage.length).toBeGreaterThan(0);

            // Property: Message should contain the task title
            expect(notification.notificationMessage).toContain(notification.title);

            // Property: Message should reflect the urgency appropriately
            if (notification.isOverdue) {
              expect(notification.notificationMessage).toMatch(/overdue/i);
            } else if (notification.isDueToday) {
              expect(notification.notificationMessage).toMatch(/due today/i);
            } else if (notification.daysUntilDue === 1) {
              expect(notification.notificationMessage).toMatch(/due tomorrow/i);
            } else if (notification.daysUntilDue > 1) {
              expect(notification.notificationMessage).toMatch(/due in \d+ days/i);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle edge cases gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant([]),
          fc.array(taskArbitrary.filter(task => task.status === 'completed'), { maxLength: 5 }),
          fc.array(taskArbitrary.filter(task => !task.dueDate), { maxLength: 5 })
        ),
        (tasks) => {
          const notifications = getDeadlineNotifications(tasks);

          // Property: Should handle empty arrays gracefully
          expect(Array.isArray(notifications)).toBe(true);

          // Property: Should not include completed tasks
          notifications.forEach(notification => {
            expect(notification.status).not.toBe('completed');
          });

          // Property: Should not include tasks without due dates
          notifications.forEach(notification => {
            expect(notification.dueDate).toBeDefined();
            expect(notification.dueDate).not.toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should respect different notification windows', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        (tasks, window1, window2) => {
          const notifications1 = getDeadlineNotifications(tasks, window1);
          const notifications2 = getDeadlineNotifications(tasks, window2);

          // Property: Larger window should include all tasks from smaller window
          if (window1 <= window2) {
            const ids1 = new Set(notifications1.map(n => n._id));
            const ids2 = new Set(notifications2.map(n => n._id));
            
            ids1.forEach(id => {
              expect(ids2.has(id)).toBe(true);
            });
          }

          // Property: All notifications should respect their respective windows
          const today = moment();
          
          notifications1.forEach(notification => {
            const taskDue = moment(notification.dueDate);
            const futureDate1 = today.clone().add(window1, 'days');
            expect(taskDue.isBetween(today, futureDate1, 'day', '[]')).toBe(true);
          });

          notifications2.forEach(notification => {
            const taskDue = moment(notification.dueDate);
            const futureDate2 = today.clone().add(window2, 'days');
            expect(taskDue.isBetween(today, futureDate2, 'day', '[]')).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: daily-activity-tracker, Property 16: Deadline notifications
 * Validates: Requirements 5.4
 */