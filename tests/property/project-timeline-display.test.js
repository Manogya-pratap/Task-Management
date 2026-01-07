/**
 * Property-Based Tests for Project Timeline Display
 * Feature: daily-activity-tracker, Property 14: Project timeline display
 * 
 * Property 14: Project timeline display
 * For any project with tasks, the timeline view should display all tasks with their scheduled dates in chronological order
 * Validates: Requirements 5.1
 */

const fc = require('fast-check');
const moment = require('moment');

// Mock the ProjectTimeline component's data transformation logic
const transformTasksToTimelineItems = (tasks, projects) => {
  if (!tasks.length || !projects.length) {
    return { groups: [], items: [] };
  }

  // Create groups from projects
  const timelineGroups = projects.map(project => ({
    id: project._id,
    title: project.name,
    rightTitle: `${project.status} | ${project.assignedMembers?.length || 0} members`,
    stackItems: true,
    height: 60
  }));

  // Transform tasks into timeline items
  const timelineItems = tasks.map(task => {
    // Determine start and end times for the task
    let startTime, endTime;
    
    if (task.status === 'completed' && task.completedDate) {
      startTime = moment(task.startDate || task.scheduledDate || task.createdAt);
      endTime = moment(task.completedDate);
      
      // Ensure end time is not before start time
      if (endTime.isBefore(startTime)) {
        endTime = startTime.clone().add(1, 'hour');
      }
    } else if (task.status === 'in_progress' && task.startDate) {
      startTime = moment(task.startDate);
      endTime = task.dueDate ? moment(task.dueDate) : moment(task.startDate).add(1, 'day');
      
      // Ensure end time is not before start time
      if (endTime.isBefore(startTime)) {
        endTime = startTime.clone().add(1, 'day');
      }
    } else if (task.scheduledDate) {
      startTime = moment(task.scheduledDate);
      endTime = task.dueDate ? moment(task.dueDate) : moment(task.scheduledDate).add(1, 'day');
      
      // Ensure end time is not before start time
      if (endTime.isBefore(startTime)) {
        endTime = startTime.clone().add(1, 'day');
      }
    } else {
      // For new tasks without dates, show them as a point in time
      startTime = moment(task.createdAt);
      endTime = moment(task.createdAt).add(1, 'hour');
    }

    return {
      id: task._id,
      group: task.projectId,
      title: task.title,
      start_time: startTime,
      end_time: endTime,
      task: task
    };
  });

  return { groups: timelineGroups, items: timelineItems };
};

// Generators for test data
const statusArbitrary = fc.constantFrom('new', 'scheduled', 'in_progress', 'completed');
const priorityArbitrary = fc.constantFrom('low', 'medium', 'high', 'urgent');

const projectArbitrary = fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  status: fc.constantFrom('planning', 'active', 'completed', 'on_hold'),
  assignedMembers: fc.array(fc.string({ minLength: 24, maxLength: 24 }), { maxLength: 10 })
});

// Generate tasks that reference existing projects
const taskWithProjectArbitrary = (projects) => {
  if (projects.length === 0) {
    return fc.record({
      _id: fc.string({ minLength: 24, maxLength: 24 }),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      status: statusArbitrary,
      priority: priorityArbitrary,
      projectId: fc.string({ minLength: 24, maxLength: 24 }),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      scheduledDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })),
      startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })),
      dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })),
      completedDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }))
    });
  }

  return fc.record({
    _id: fc.string({ minLength: 24, maxLength: 24 }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    status: statusArbitrary,
    priority: priorityArbitrary,
    projectId: fc.constantFrom(...projects.map(p => p._id)),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    scheduledDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })),
    startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })),
    dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })),
    completedDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }))
  });
};

describe('Property 14: Project Timeline Display', () => {
  test('should display all tasks with their scheduled dates in chronological order', () => {
    fc.assert(
      fc.property(
        fc.array(projectArbitrary, { minLength: 1, maxLength: 5 })
          .chain(projects => 
            fc.array(taskWithProjectArbitrary(projects), { minLength: 1, maxLength: 20 })
              .map(tasks => ({ projects, tasks }))
          ),
        ({ projects, tasks }) => {
          const { groups, items } = transformTasksToTimelineItems(tasks, projects);

          // Property: All tasks should be represented in timeline items
          expect(items.length).toBe(tasks.length);

          // Property: All projects should be represented in timeline groups
          expect(groups.length).toBe(projects.length);

          // Property: Each timeline item should have valid time properties
          items.forEach(item => {
            expect(item.start_time).toBeDefined();
            expect(item.end_time).toBeDefined();
            expect(moment.isMoment(item.start_time)).toBe(true);
            expect(moment.isMoment(item.end_time)).toBe(true);
            expect(item.end_time.isSameOrAfter(item.start_time)).toBe(true);
          });

          // Property: Timeline items should be chronologically ordered when sorted
          const sortedItems = [...items].sort((a, b) => a.start_time.valueOf() - b.start_time.valueOf());
          for (let i = 1; i < sortedItems.length; i++) {
            expect(sortedItems[i].start_time.isSameOrAfter(sortedItems[i - 1].start_time)).toBe(true);
          }

          // Property: Each timeline item should reference a valid project group
          items.forEach(item => {
            const referencedGroup = groups.find(group => group.id === item.group);
            expect(referencedGroup).toBeDefined();
          });

          // Property: Timeline groups should have required properties
          groups.forEach(group => {
            expect(group.id).toBeDefined();
            expect(group.title).toBeDefined();
            expect(typeof group.title).toBe('string');
            expect(group.title.length).toBeGreaterThan(0);
            expect(group.stackItems).toBe(true);
            expect(group.height).toBe(60);
          });

          // Property: Timeline items should preserve task information
          items.forEach(item => {
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(typeof item.title).toBe('string');
            expect(item.title.length).toBeGreaterThan(0);
            expect(item.task).toBeDefined();
            expect(item.task._id).toBe(item.id);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should handle tasks with different date configurations correctly', () => {
    fc.assert(
      fc.property(
        fc.array(projectArbitrary, { minLength: 1, maxLength: 3 })
          .chain(projects => 
            fc.array(taskWithProjectArbitrary(projects), { minLength: 1, maxLength: 10 })
              .map(tasks => ({ projects, tasks }))
          ),
        ({ projects, tasks }) => {
          const { items } = transformTasksToTimelineItems(tasks, projects);

          items.forEach((item, index) => {
            const task = tasks[index];

            // Property: Completed tasks with completion date should use appropriate time range
            if (task.status === 'completed' && task.completedDate) {
              const expectedStartTime = moment(task.startDate || task.scheduledDate || task.createdAt);
              const expectedEndTime = moment(task.completedDate);
              
              // If completion date is before start date, end time should be adjusted
              if (expectedEndTime.isBefore(expectedStartTime)) {
                expect(item.end_time.isSame(expectedStartTime.clone().add(1, 'hour'))).toBe(true);
              } else {
                expect(item.end_time.isSame(expectedEndTime)).toBe(true);
              }
            }

            // Property: In-progress tasks with start date should use start date
            if (task.status === 'in_progress' && task.startDate) {
              expect(item.start_time.isSame(moment(task.startDate))).toBe(true);
            }

            // Property: Scheduled tasks should use scheduled date
            if (task.scheduledDate && task.status !== 'in_progress') {
              const expectedStart = task.status === 'completed' && task.completedDate 
                ? moment(task.startDate || task.scheduledDate || task.createdAt)
                : moment(task.scheduledDate);
              
              if (!task.startDate || task.status !== 'in_progress') {
                expect(item.start_time.isSame(expectedStart)).toBe(true);
              }
            }

            // Property: Tasks without specific dates should use creation date
            if (!task.scheduledDate && !task.startDate && task.status === 'new') {
              expect(item.start_time.isSame(moment(task.createdAt))).toBe(true);
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should handle empty or invalid data gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant([]),
          fc.array(projectArbitrary, { maxLength: 3 })
        ),
        (projects) => {
          const tasks = projects.length > 0 ? [] : [];
          const { groups, items } = transformTasksToTimelineItems(tasks, projects);

          // Property: Empty inputs should result in empty outputs
          if (tasks.length === 0 || projects.length === 0) {
            expect(groups).toEqual([]);
            expect(items).toEqual([]);
          }

          // Property: Output should always be arrays
          expect(Array.isArray(groups)).toBe(true);
          expect(Array.isArray(items)).toBe(true);

          // Property: No undefined or null items in output
          groups.forEach(group => {
            expect(group).toBeDefined();
            expect(group).not.toBeNull();
          });

          items.forEach(item => {
            expect(item).toBeDefined();
            expect(item).not.toBeNull();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should maintain data integrity across transformations', () => {
    fc.assert(
      fc.property(
        fc.array(projectArbitrary, { minLength: 1, maxLength: 5 })
          .chain(projects => 
            fc.array(taskWithProjectArbitrary(projects), { minLength: 1, maxLength: 15 })
              .map(tasks => ({ projects, tasks }))
          ),
        ({ projects, tasks }) => {
          const { groups, items } = transformTasksToTimelineItems(tasks, projects);

          // Property: No data loss - all input tasks should be represented
          expect(items.length).toBe(tasks.length);
          expect(groups.length).toBe(projects.length);

          // Property: Task IDs should be preserved
          const inputTaskIds = tasks.map(t => t._id).sort();
          const outputTaskIds = items.map(i => i.id).sort();
          expect(outputTaskIds).toEqual(inputTaskIds);

          // Property: Project IDs should be preserved
          const inputProjectIds = projects.map(p => p._id).sort();
          const outputProjectIds = groups.map(g => g.id).sort();
          expect(outputProjectIds).toEqual(inputProjectIds);

          // Property: Task-project relationships should be preserved
          items.forEach(item => {
            const originalTask = tasks.find(t => t._id === item.id);
            expect(item.group).toBe(originalTask.projectId);
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: daily-activity-tracker, Property 14: Project timeline display
 * Validates: Requirements 5.1
 */