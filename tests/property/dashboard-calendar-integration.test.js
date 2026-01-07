/**
 * Property-Based Tests for Dashboard Calendar Integration
 * Feature: daily-activity-tracker, Property 17: Dashboard calendar integration
 * 
 * Property 17: Dashboard calendar integration
 * For any user viewing their dashboard, the calendar should display all their assigned tasks and relevant project milestones
 * Validates: Requirements 5.5
 */

const fc = require('fast-check');
const moment = require('moment');

// Mock dashboard calendar integration
const getDashboardCalendarData = (user, tasks, projects) => {
  // Filter tasks based on user role and assignments
  const userTasks = filterTasksByUser(user, tasks);
  
  // Get relevant project milestones
  const userProjects = filterProjectsByUser(user, projects);
  const projectMilestones = extractProjectMilestones(userProjects);
  
  // Combine tasks and milestones into calendar events
  const calendarEvents = [
    ...userTasks.map(task => taskToCalendarEvent(task)),
    ...projectMilestones.map(milestone => milestoneToCalendarEvent(milestone))
  ];
  
  // Sort events by date
  return calendarEvents.sort((a, b) => moment(a.date) - moment(b.date));
};

const filterTasksByUser = (user, tasks) => {
  return tasks.filter(task => {
    // MD and IT_Admin can see all tasks
    if (user.role === 'managing_director' || user.role === 'it_admin') {
      return true;
    }
    
    // Team leads can see their team's tasks
    if (user.role === 'team_lead' && task.teamId === user.teamId) {
      return true;
    }
    
    // Users can see tasks assigned to them or created by them
    return task.assignedTo === user._id || task.createdBy === user._id;
  });
};

const filterProjectsByUser = (user, projects) => {
  return projects.filter(project => {
    // MD and IT_Admin can see all projects
    if (user.role === 'managing_director' || user.role === 'it_admin') {
      return true;
    }
    
    // Team leads can see their team's projects
    if (user.role === 'team_lead' && project.teamId === user.teamId) {
      return true;
    }
    
    // Users can see projects they're assigned to or created
    return project.assignedMembers?.includes(user._id) || project.createdBy === user._id;
  });
};

const extractProjectMilestones = (projects) => {
  const milestones = [];
  
  projects.forEach(project => {
    // Project start date milestone
    if (project.startDate) {
      milestones.push({
        id: `${project._id}-start`,
        projectId: project._id,
        projectName: project.name,
        type: 'project-start',
        date: project.startDate,
        title: `${project.name} - Start`,
        description: `Project "${project.name}" begins`
      });
    }
    
    // Project end date milestone
    if (project.endDate) {
      milestones.push({
        id: `${project._id}-end`,
        projectId: project._id,
        projectName: project.name,
        type: 'project-end',
        date: project.endDate,
        title: `${project.name} - Deadline`,
        description: `Project "${project.name}" deadline`
      });
    }
  });
  
  return milestones;
};

const taskToCalendarEvent = (task) => {
  // Determine the most relevant date for the task
  let eventDate = task.dueDate || task.scheduledDate || task.startDate || task.createdAt;
  let eventType = 'task';
  
  if (task.dueDate) {
    eventType = 'task-due';
  } else if (task.scheduledDate) {
    eventType = 'task-scheduled';
  } else if (task.startDate) {
    eventType = 'task-start';
  }
  
  return {
    id: task._id,
    type: eventType,
    date: eventDate,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo,
    projectId: task.projectId,
    isTask: true
  };
};

const milestoneToCalendarEvent = (milestone) => {
  return {
    id: milestone.id,
    type: milestone.type,
    date: milestone.date,
    title: milestone.title,
    description: milestone.description,
    projectId: milestone.projectId,
    projectName: milestone.projectName,
    isMilestone: true
  };
};

// Generators for test data
const roleArbitrary = fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee');
const statusArbitrary = fc.constantFrom('new', 'scheduled', 'in_progress', 'completed');
const priorityArbitrary = fc.constantFrom('low', 'medium', 'high', 'urgent');
const projectStatusArbitrary = fc.constantFrom('planning', 'active', 'completed', 'on_hold');

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
  description: fc.option(fc.string({ minLength: 0, maxLength: 1000 })),
  status: statusArbitrary,
  priority: priorityArbitrary,
  assignedTo: fc.option(fc.string({ minLength: 24, maxLength: 24 })),
  createdBy: fc.string({ minLength: 24, maxLength: 24 }),
  teamId: fc.string({ minLength: 24, maxLength: 24 }),
  projectId: fc.string({ minLength: 24, maxLength: 24 }),
  scheduledDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
  startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
  dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
});

const projectArbitrary = fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  status: projectStatusArbitrary,
  teamId: fc.string({ minLength: 24, maxLength: 24 }),
  createdBy: fc.string({ minLength: 24, maxLength: 24 }),
  assignedMembers: fc.array(fc.string({ minLength: 24, maxLength: 24 }), { maxLength: 10 }),
  startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
  endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }))
});

describe('Property 17: Dashboard Calendar Integration', () => {
  test('should display all assigned tasks and relevant project milestones', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.array(taskArbitrary, { minLength: 0, maxLength: 30 }),
        fc.array(projectArbitrary, { minLength: 0, maxLength: 10 }),
        (user, tasks, projects) => {
          const calendarEvents = getDashboardCalendarData(user, tasks, projects);

          // Property: All events should have required properties
          calendarEvents.forEach(event => {
            expect(event.id).toBeDefined();
            expect(event.type).toBeDefined();
            expect(event.date).toBeDefined();
            expect(event.title).toBeDefined();
            expect(typeof event.title).toBe('string');
            expect(event.title.length).toBeGreaterThan(0);
          });

          // Property: Events should be sorted by date
          for (let i = 1; i < calendarEvents.length; i++) {
            const prevDate = moment(calendarEvents[i - 1].date);
            const currDate = moment(calendarEvents[i].date);
            expect(currDate.isSameOrAfter(prevDate)).toBe(true);
          }

          // Property: Task events should preserve task information
          const taskEvents = calendarEvents.filter(event => event.isTask);
          taskEvents.forEach(event => {
            expect(event.status).toBeDefined();
            expect(event.priority).toBeDefined();
            expect(event.projectId).toBeDefined();
          });

          // Property: Milestone events should preserve project information
          const milestoneEvents = calendarEvents.filter(event => event.isMilestone);
          milestoneEvents.forEach(event => {
            expect(event.projectId).toBeDefined();
            expect(event.projectName).toBeDefined();
            expect(['project-start', 'project-end'].includes(event.type)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should respect role-based access control for tasks', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
        fc.array(projectArbitrary, { minLength: 0, maxLength: 5 }),
        (user, tasks, projects) => {
          const calendarEvents = getDashboardCalendarData(user, tasks, projects);
          const taskEvents = calendarEvents.filter(event => event.isTask);

          taskEvents.forEach(event => {
            const originalTask = tasks.find(task => task._id === event.id);
            expect(originalTask).toBeDefined();

            // Property: MD and IT_Admin should see all tasks
            if (user.role === 'managing_director' || user.role === 'it_admin') {
              // This task should be visible (no additional checks needed)
              expect(true).toBe(true);
            } else if (user.role === 'team_lead') {
              // Property: Team leads should only see their team's tasks
              expect(originalTask.teamId).toBe(user.teamId);
            } else {
              // Property: Employees should only see tasks assigned to them or created by them
              expect(
                originalTask.assignedTo === user._id || originalTask.createdBy === user._id
              ).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should respect role-based access control for projects', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.array(taskArbitrary, { minLength: 0, maxLength: 10 }),
        fc.array(projectArbitrary, { minLength: 1, maxLength: 15 }),
        (user, tasks, projects) => {
          const calendarEvents = getDashboardCalendarData(user, tasks, projects);
          const milestoneEvents = calendarEvents.filter(event => event.isMilestone);

          milestoneEvents.forEach(event => {
            const originalProject = projects.find(project => project._id === event.projectId);
            expect(originalProject).toBeDefined();

            // Property: MD and IT_Admin should see all project milestones
            if (user.role === 'managing_director' || user.role === 'it_admin') {
              // This milestone should be visible (no additional checks needed)
              expect(true).toBe(true);
            } else if (user.role === 'team_lead') {
              // Property: Team leads should only see their team's project milestones
              expect(originalProject.teamId).toBe(user.teamId);
            } else {
              // Property: Employees should only see milestones for projects they're involved in
              expect(
                originalProject.assignedMembers?.includes(user._id) || 
                originalProject.createdBy === user._id
              ).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should include appropriate project milestones', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.array(taskArbitrary, { minLength: 0, maxLength: 5 }),
        fc.array(projectArbitrary, { minLength: 1, maxLength: 10 }),
        (user, tasks, projects) => {
          const calendarEvents = getDashboardCalendarData(user, tasks, projects);
          const milestoneEvents = calendarEvents.filter(event => event.isMilestone);

          // Get projects visible to this user
          const visibleProjects = filterProjectsByUser(user, projects);

          // Property: Should have milestones for projects with start/end dates
          visibleProjects.forEach(project => {
            if (project.startDate) {
              const startMilestone = milestoneEvents.find(
                event => event.projectId === project._id && event.type === 'project-start'
              );
              expect(startMilestone).toBeDefined();
              expect(moment(startMilestone.date).isSame(moment(project.startDate))).toBe(true);
            }

            if (project.endDate) {
              const endMilestone = milestoneEvents.find(
                event => event.projectId === project._id && event.type === 'project-end'
              );
              expect(endMilestone).toBeDefined();
              expect(moment(endMilestone.date).isSame(moment(project.endDate))).toBe(true);
            }
          });

          // Property: Should not have milestones for projects without dates
          milestoneEvents.forEach(milestone => {
            const project = visibleProjects.find(p => p._id === milestone.projectId);
            expect(project).toBeDefined();
            
            if (milestone.type === 'project-start') {
              expect(project.startDate).toBeDefined();
            } else if (milestone.type === 'project-end') {
              expect(project.endDate).toBeDefined();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should use appropriate dates for task events', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.array(taskArbitrary, { minLength: 1, maxLength: 15 }),
        fc.array(projectArbitrary, { minLength: 0, maxLength: 5 }),
        (user, tasks, projects) => {
          const calendarEvents = getDashboardCalendarData(user, tasks, projects);
          const taskEvents = calendarEvents.filter(event => event.isTask);

          taskEvents.forEach(event => {
            const originalTask = tasks.find(task => task._id === event.id);
            expect(originalTask).toBeDefined();

            // Property: Should use the most appropriate date
            if (originalTask.dueDate) {
              expect(moment(event.date).isSame(moment(originalTask.dueDate))).toBe(true);
              expect(event.type).toBe('task-due');
            } else if (originalTask.scheduledDate) {
              expect(moment(event.date).isSame(moment(originalTask.scheduledDate))).toBe(true);
              expect(event.type).toBe('task-scheduled');
            } else if (originalTask.startDate) {
              expect(moment(event.date).isSame(moment(originalTask.startDate))).toBe(true);
              expect(event.type).toBe('task-start');
            } else {
              expect(moment(event.date).isSame(moment(originalTask.createdAt))).toBe(true);
              expect(event.type).toBe('task');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle empty data gracefully', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.oneof(
          fc.constant([]),
          fc.array(taskArbitrary, { maxLength: 3 })
        ),
        fc.oneof(
          fc.constant([]),
          fc.array(projectArbitrary, { maxLength: 3 })
        ),
        (user, tasks, projects) => {
          const calendarEvents = getDashboardCalendarData(user, tasks, projects);

          // Property: Should always return an array
          expect(Array.isArray(calendarEvents)).toBe(true);

          // Property: Empty inputs should result in empty or minimal output
          if (tasks.length === 0 && projects.length === 0) {
            expect(calendarEvents.length).toBe(0);
          }

          // Property: All events should be valid
          calendarEvents.forEach(event => {
            expect(event).toBeDefined();
            expect(event.id).toBeDefined();
            expect(event.date).toBeDefined();
            expect(event.title).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should maintain data integrity across transformations', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.array(projectArbitrary, { minLength: 1, maxLength: 5 }),
        (user, tasks, projects) => {
          const calendarEvents = getDashboardCalendarData(user, tasks, projects);

          // Property: Task events should preserve original task data
          const taskEvents = calendarEvents.filter(event => event.isTask);
          taskEvents.forEach(event => {
            const originalTask = tasks.find(task => task._id === event.id);
            expect(originalTask).toBeDefined();
            
            expect(event.title).toBe(originalTask.title);
            expect(event.description).toBe(originalTask.description);
            expect(event.status).toBe(originalTask.status);
            expect(event.priority).toBe(originalTask.priority);
            expect(event.assignedTo).toBe(originalTask.assignedTo);
            expect(event.projectId).toBe(originalTask.projectId);
          });

          // Property: Milestone events should preserve project data
          const milestoneEvents = calendarEvents.filter(event => event.isMilestone);
          milestoneEvents.forEach(event => {
            const originalProject = projects.find(project => project._id === event.projectId);
            expect(originalProject).toBeDefined();
            
            expect(event.projectName).toBe(originalProject.name);
            expect(event.title).toContain(originalProject.name);
          });

          // Property: No data corruption should occur
          calendarEvents.forEach(event => {
            expect(event.id).not.toBeNull();
            expect(event.id).not.toBeUndefined();
            expect(event.title).not.toBeNull();
            expect(event.title).not.toBeUndefined();
            expect(event.date).not.toBeNull();
            expect(event.date).not.toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: daily-activity-tracker, Property 17: Dashboard calendar integration
 * Validates: Requirements 5.5
 */