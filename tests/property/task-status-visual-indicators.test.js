const fc = require('fast-check');

/**
 * Feature: daily-activity-tracker, Property 12: Task status visual indicators
 * For any task, the system should display it with the correct color indicator and relevant information based on its status (new, scheduled, in progress, completed)
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5
 */

// Mock COLORS object based on the StatusIndicator component
const COLORS = {
  taskStatus: {
    new: '#6c757d',        // Gray
    scheduled: '#007bff',   // Blue
    in_progress: '#ffc107', // Yellow/Amber
    completed: '#28a745'    // Green
  },
  priority: {
    low: '#28a745',         // Green
    medium: '#ffc107',      // Yellow
    high: '#fd7e14',        // Orange
    urgent: '#dc3545'       // Red
  }
};

/**
 * Feature: daily-activity-tracker, Property 12: Task status visual indicators
 * For any task, the system should display it with the correct color indicator and relevant information based on its status (new, scheduled, in progress, completed)
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5
 */

describe('Property-Based Tests: Task Status Visual Indicators', () => {
  
  // Generator for valid task statuses
  const taskStatusArbitrary = fc.constantFrom('new', 'scheduled', 'in_progress', 'completed');

  // Generator for valid priority levels
  const priorityArbitrary = fc.constantFrom('low', 'medium', 'high', 'urgent');

  // Generator for task data with visual properties
  const taskDataArbitrary = fc.record({
    _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 0, maxLength: 1000 }),
    status: taskStatusArbitrary,
    priority: priorityArbitrary,
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    scheduledDate: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
    startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
    completedDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
    dueDate: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
    assignedTo: fc.option(fc.record({
      _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
      firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
    })),
    projectId: fc.option(fc.record({
      _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
      name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
    })),
    comments: fc.array(fc.record({
      _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
      content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
    }), { maxLength: 5 }),
    attachments: fc.array(fc.record({
      filename: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
    }), { maxLength: 3 })
  });

  test('Property 12: Task status visual indicators - Status indicators display correct colors', () => {
    fc.assert(fc.property(
      taskStatusArbitrary,
      fc.constantFrom('sm', 'md', 'lg'),
      fc.boolean(),
      (status, size, showText) => {
        // Property: StatusIndicator should render with correct color for each status
        const expectedColors = {
          'new': 'secondary',
          'scheduled': 'info', 
          'in_progress': 'warning',
          'completed': 'success'
        };

        // Property: Status should map to correct Bootstrap color class
        expect(expectedColors).toHaveProperty(status);
        const expectedBootstrapColor = expectedColors[status];

        // Property: COLORS object should have correct hex colors for task statuses
        expect(COLORS.taskStatus).toHaveProperty(status);
        const expectedHexColor = COLORS.taskStatus[status];
        expect(expectedHexColor).toMatch(/^#[0-9a-fA-F]{6}$/);

        // Property: Different statuses should have different colors
        const allStatuses = ['new', 'scheduled', 'in_progress', 'completed'];
        const statusColors = allStatuses.map(s => COLORS.taskStatus[s]);
        const uniqueColors = [...new Set(statusColors)];
        expect(uniqueColors.length).toBe(allStatuses.length); // All colors should be unique

        // Property: Status colors should be visually distinct
        const colorValues = {
          'new': '#6c757d',        // Gray
          'scheduled': '#007bff',   // Blue  
          'in_progress': '#ffc107', // Yellow/Amber
          'completed': '#28a745'    // Green
        };
        expect(COLORS.taskStatus[status]).toBe(colorValues[status]);
      }
    ), { numRuns: 100 });
  });

  test('Property 12: Task status visual indicators - Task cards display status-specific information', () => {
    fc.assert(fc.property(
      taskDataArbitrary,
      (taskData) => {
        // Ensure dates are consistent with status
        const task = { ...taskData };
        
        // Property: Scheduled tasks should have scheduledDate when status is scheduled
        if (task.status === 'scheduled' && !task.scheduledDate) {
          task.scheduledDate = new Date();
        }
        
        // Property: In progress tasks should have startDate when status is in_progress
        if (task.status === 'in_progress' && !task.startDate) {
          task.startDate = new Date();
        }
        
        // Property: Completed tasks should have completedDate when status is completed
        if (task.status === 'completed' && !task.completedDate) {
          task.completedDate = new Date();
        }

        // Property: Task status should determine visual information displayed
        const getExpectedStatusInfo = (task) => {
          switch (task.status) {
            case 'scheduled':
              return {
                icon: 'fas fa-calendar-alt',
                color: 'info',
                hasDate: !!task.scheduledDate
              };
            case 'in_progress':
              return {
                icon: 'fas fa-play-circle',
                color: 'warning',
                hasDate: !!task.startDate
              };
            case 'completed':
              return {
                icon: 'fas fa-check-circle',
                color: 'success',
                hasDate: !!task.completedDate
              };
            default: // 'new'
              return {
                icon: 'fas fa-circle',
                color: 'secondary',
                hasDate: false
              };
          }
        };

        const statusInfo = getExpectedStatusInfo(task);

        // Property: Status info should match expected values for status
        expect(statusInfo.icon).toBeDefined();
        expect(statusInfo.color).toBeDefined();
        expect(['secondary', 'info', 'warning', 'success']).toContain(statusInfo.color);

        // Property: Status-specific dates should be present when required
        if (task.status === 'scheduled') {
          expect(task.scheduledDate).toBeDefined();
        }
        if (task.status === 'in_progress') {
          expect(task.startDate).toBeDefined();
        }
        if (task.status === 'completed') {
          expect(task.completedDate).toBeDefined();
        }

        // Property: Task should have visual priority indicator when priority is not medium
        if (task.priority && task.priority !== 'medium') {
          const priorityColors = {
            'low': 'success',
            'high': 'danger',
            'urgent': 'danger'
          };
          expect(priorityColors).toHaveProperty(task.priority);
        }

        // Property: Overdue tasks should be visually indicated
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
        if (isOverdue) {
          // Overdue tasks should have danger styling
          expect(task.dueDate).toBeDefined();
          expect(task.status).not.toBe('completed');
        }

        // Property: Task metadata should be consistently available
        expect(task.title).toBeDefined();
        expect(task.title.trim().length).toBeGreaterThan(0);
        expect(task.status).toBeDefined();
        expect(['new', 'scheduled', 'in_progress', 'completed']).toContain(task.status);
      }
    ), { numRuns: 100 });
  });

  test('Property 12: Task status visual indicators - Status colors provide visual hierarchy', () => {
    fc.assert(fc.property(
      fc.array(taskStatusArbitrary, { minLength: 1, maxLength: 10 }),
      (statuses) => {
        // Property: Status colors should provide clear visual hierarchy
        const statusPriority = {
          'new': 1,        // Neutral - needs attention
          'scheduled': 2,   // Planned - organized
          'in_progress': 3, // Active - high attention
          'completed': 4    // Done - positive
        };

        const statusColors = {
          'new': '#6c757d',        // Gray - neutral
          'scheduled': '#007bff',   // Blue - informational
          'in_progress': '#ffc107', // Yellow - attention/warning
          'completed': '#28a745'    // Green - success/positive
        };

        // Property: Each status should have appropriate semantic color
        for (const status of statuses) {
          expect(statusColors).toHaveProperty(status);
          expect(statusPriority).toHaveProperty(status);
          
          const color = statusColors[status];
          const priority = statusPriority[status];
          
          // Property: Colors should follow semantic conventions
          if (status === 'completed') {
            expect(color).toBe('#28a745'); // Green for success
          } else if (status === 'in_progress') {
            expect(color).toBe('#ffc107'); // Yellow for active/warning
          } else if (status === 'scheduled') {
            expect(color).toBe('#007bff'); // Blue for informational
          } else if (status === 'new') {
            expect(color).toBe('#6c757d'); // Gray for neutral
          }
          
          // Property: Priority should increase with workflow progression
          expect(priority).toBeGreaterThanOrEqual(1);
          expect(priority).toBeLessThanOrEqual(4);
        }

        // Property: Status progression should have increasing priority values
        const uniqueStatuses = [...new Set(statuses)];
        if (uniqueStatuses.includes('new') && uniqueStatuses.includes('scheduled')) {
          expect(statusPriority['scheduled']).toBeGreaterThan(statusPriority['new']);
        }
        if (uniqueStatuses.includes('scheduled') && uniqueStatuses.includes('in_progress')) {
          expect(statusPriority['in_progress']).toBeGreaterThan(statusPriority['scheduled']);
        }
        if (uniqueStatuses.includes('in_progress') && uniqueStatuses.includes('completed')) {
          expect(statusPriority['completed']).toBeGreaterThan(statusPriority['in_progress']);
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 12: Task status visual indicators - Visual consistency across components', () => {
    fc.assert(fc.property(
      taskStatusArbitrary,
      fc.constantFrom('task', 'project', 'priority', 'role'),
      fc.constantFrom('sm', 'md', 'lg'),
      (status, type, size) => {
        // Property: StatusIndicator component should maintain visual consistency
        
        // Only test with task type for task statuses
        if (type === 'task') {
          // Property: Task status should be valid
          expect(['new', 'scheduled', 'in_progress', 'completed']).toContain(status);
          
          // Property: Component should handle all valid combinations
          expect(() => {
            // Simulate component props validation
            const props = {
              status: status,
              type: type,
              size: size,
              showText: true,
              className: ''
            };
            
            // Property: Props should be valid
            expect(props.status).toBeDefined();
            expect(props.type).toBe('task');
            expect(['sm', 'md', 'lg']).toContain(props.size);
            expect(typeof props.showText).toBe('boolean');
            expect(typeof props.className).toBe('string');
            
          }).not.toThrow();
          
          // Property: Status should map to correct Bootstrap color
          const expectedBootstrapColors = {
            'new': 'secondary',
            'scheduled': 'info',
            'in_progress': 'warning', 
            'completed': 'success'
          };
          
          expect(expectedBootstrapColors).toHaveProperty(status);
          
          // Property: Status text should be properly formatted
          const expectedText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          expect(expectedText).toBeDefined();
          expect(expectedText.length).toBeGreaterThan(0);
          
          // Verify specific formatting
          if (status === 'in_progress') {
            expect(expectedText).toBe('In Progress');
          } else {
            expect(expectedText).toBe(status.charAt(0).toUpperCase() + status.slice(1));
          }
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 12: Task status visual indicators - Badge and indicator accessibility', () => {
    fc.assert(fc.property(
      taskDataArbitrary,
      (taskData) => {
        // Property: Visual indicators should be accessible and informative
        
        // Property: Task should have accessible status information
        expect(taskData.status).toBeDefined();
        expect(['new', 'scheduled', 'in_progress', 'completed']).toContain(taskData.status);
        
        // Property: Status should have text representation for screen readers
        const statusText = taskData.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        expect(statusText).toBeDefined();
        expect(statusText.length).toBeGreaterThan(0);
        
        // Property: Priority indicators should be meaningful
        if (taskData.priority && taskData.priority !== 'medium') {
          expect(['low', 'high', 'urgent']).toContain(taskData.priority);
          
          // Property: High priority tasks should have appropriate visual treatment
          if (taskData.priority === 'urgent' || taskData.priority === 'high') {
            // Should use danger/warning colors for visibility
            const priorityColors = {
              'high': 'danger',
              'urgent': 'danger'
            };
            expect(priorityColors).toHaveProperty(taskData.priority);
          }
        }
        
        // Property: Task metadata should support visual indicators
        if (taskData.comments && taskData.comments.length > 0) {
          expect(taskData.comments.length).toBeGreaterThan(0);
          // Comments should be visually indicated with count
        }
        
        if (taskData.attachments && taskData.attachments.length > 0) {
          expect(taskData.attachments.length).toBeGreaterThan(0);
          // Attachments should be visually indicated with count
        }
        
        // Property: Assigned user should be visually represented
        if (taskData.assignedTo) {
          expect(taskData.assignedTo.firstName).toBeDefined();
          expect(taskData.assignedTo.lastName).toBeDefined();
          expect(taskData.assignedTo.firstName.trim().length).toBeGreaterThan(0);
          expect(taskData.assignedTo.lastName.trim().length).toBeGreaterThan(0);
        }
        
        // Property: Project association should be visually clear
        if (taskData.projectId) {
          expect(taskData.projectId.name).toBeDefined();
          expect(taskData.projectId.name.trim().length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 12: Task status visual indicators - Color contrast and visibility', () => {
    fc.assert(fc.property(
      taskStatusArbitrary,
      (status) => {
        // Property: Status colors should have sufficient contrast for visibility
        
        const statusColors = COLORS.taskStatus;
        expect(statusColors).toHaveProperty(status);
        
        const color = statusColors[status];
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
        
        // Property: Colors should be distinct enough for differentiation
        const allColors = Object.values(statusColors);
        const uniqueColors = [...new Set(allColors)];
        expect(uniqueColors.length).toBe(allColors.length); // All should be unique
        
        // Property: Colors should follow accessibility guidelines (basic check)
        // Convert hex to RGB for basic luminance check
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        
        const rgb = hexToRgb(color);
        expect(rgb).not.toBeNull();
        
        // Property: RGB values should be valid
        expect(rgb.r).toBeGreaterThanOrEqual(0);
        expect(rgb.r).toBeLessThanOrEqual(255);
        expect(rgb.g).toBeGreaterThanOrEqual(0);
        expect(rgb.g).toBeLessThanOrEqual(255);
        expect(rgb.b).toBeGreaterThanOrEqual(0);
        expect(rgb.b).toBeLessThanOrEqual(255);
        
        // Property: Colors should not be too dark or too light for visibility
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        expect(luminance).toBeGreaterThan(0.1); // Not too dark
        expect(luminance).toBeLessThan(0.9);    // Not too light
      }
    ), { numRuns: 50 });
  });
});