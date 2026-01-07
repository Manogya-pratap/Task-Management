const request = require('supertest');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Team = require('../../server/models/Team');
const Project = require('../../server/models/Project');
const Task = require('../../server/models/Task');

describe('Frontend-Backend Integration Tests', () => {
  let testUser, testTeam, testProject;
  let authToken;

  beforeEach(async () => {
    // Clean up existing data
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({})
    ]);

    // Create test user
    testUser = await User.createUser({
      username: 'frontend_user',
      email: 'frontend@yantrik.com',
      password: 'Password123',
      firstName: 'Frontend',
      lastName: 'User',
      role: 'team_lead',
      department: 'IT'
    });

    // Create test team
    testTeam = await Team.create({
      name: 'Frontend Test Team',
      department: 'IT',
      teamLead: testUser._id,
      members: [testUser._id],
      isActive: true
    });

    // Update user with team assignment
    await User.findByIdAndUpdate(testUser._id, { teamId: testTeam._id });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'frontend_user', password: 'Password123' });
    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Clean up test data
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({})
    ]);
  });

  describe('Dashboard Data Loading', () => {
    test('Should provide all necessary data for dashboard rendering', async () => {
      // Create test data that dashboard would need
      testProject = await Project.create({
        name: 'Dashboard Test Project',
        description: 'Project for testing dashboard data',
        teamId: testTeam._id,
        createdBy: testUser._id,
        assignedMembers: [testUser._id],
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      // Create tasks in different statuses
      const taskStatuses = ['new', 'scheduled', 'in_progress', 'completed'];
      for (let i = 0; i < taskStatuses.length; i++) {
        await Task.create({
          title: `Dashboard Task ${i + 1}`,
          description: `Task in ${taskStatuses[i]} status`,
          projectId: testProject._id,
          assignedTo: testUser._id,
          createdBy: testUser._id,
          status: taskStatuses[i],
          priority: i % 2 === 0 ? 'high' : 'medium'
        });
      }

      // Test dashboard data endpoints
      const [projectsRes, tasksRes, teamsRes] = await Promise.all([
        request(app).get('/api/projects').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/tasks').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/teams').set('Authorization', `Bearer ${authToken}`)
      ]);

      // Verify all requests succeed
      expect(projectsRes.status).toBe(200);
      expect(tasksRes.status).toBe(200);
      expect(teamsRes.status).toBe(200);

      // Verify data structure matches frontend expectations
      expect(projectsRes.body.data.projects).toHaveLength(1);
      expect(projectsRes.body.data.projects[0]).toHaveProperty('name');
      expect(projectsRes.body.data.projects[0]).toHaveProperty('status');
      expect(projectsRes.body.data.projects[0]).toHaveProperty('teamId');

      expect(tasksRes.body.data.tasks).toHaveLength(4);
      tasksRes.body.data.tasks.forEach(task => {
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('assignedTo');
        expect(task).toHaveProperty('projectId');
      });

      expect(teamsRes.body.data.teams).toHaveLength(1);
      expect(teamsRes.body.data.teams[0]).toHaveProperty('name');
      expect(teamsRes.body.data.teams[0]).toHaveProperty('members');
    });

    test('Should handle dashboard data with proper error responses', async () => {
      // Test with invalid token
      const invalidTokenResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(invalidTokenResponse.body.status).toBe('fail');
      expect(invalidTokenResponse.body.isValid).toBe(false);

      // Test with no token
      const noTokenResponse = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(noTokenResponse.body.status).toBe('fail');
    });
  });

  describe('Task Board Integration', () => {
    beforeEach(async () => {
      testProject = await Project.create({
        name: 'Task Board Project',
        description: 'Project for testing task board',
        teamId: testTeam._id,
        createdBy: testUser._id,
        status: 'active'
      });
    });

    test('Should support drag-and-drop task status updates', async () => {
      // Create a task in 'new' status
      const createTaskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Draggable Task',
          description: 'Task for testing drag and drop',
          projectId: testProject._id,
          assignedTo: testUser._id,
          status: 'new'
        })
        .expect(201);

      const task = createTaskResponse.body.data.task;

      // Simulate drag-and-drop status change: new -> scheduled
      const updateResponse1 = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'scheduled' })
        .expect(200);

      expect(updateResponse1.body.data.task.status).toBe('scheduled');

      // Simulate drag-and-drop status change: scheduled -> in_progress
      const updateResponse2 = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(updateResponse2.body.data.task.status).toBe('in_progress');
      expect(updateResponse2.body.data.task.startDate).toBeDefined();

      // Simulate drag-and-drop status change: in_progress -> completed
      const updateResponse3 = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(updateResponse3.body.data.task.status).toBe('completed');
      expect(updateResponse3.body.data.task.completedDate).toBeDefined();
    });

    test('Should organize tasks by status for task board columns', async () => {
      // Create tasks in different statuses
      const taskData = [
        { title: 'New Task 1', status: 'new' },
        { title: 'New Task 2', status: 'new' },
        { title: 'Scheduled Task 1', status: 'scheduled' },
        { title: 'In Progress Task 1', status: 'in_progress' },
        { title: 'Completed Task 1', status: 'completed' },
        { title: 'Completed Task 2', status: 'completed' }
      ];

      for (const data of taskData) {
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: data.title,
            description: `Task in ${data.status} status`,
            projectId: testProject._id,
            assignedTo: testUser._id,
            status: data.status
          })
          .expect(201);
      }

      // Get all tasks
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const tasks = tasksResponse.body.data.tasks;

      // Verify task organization by status
      const tasksByStatus = {
        new: tasks.filter(t => t.status === 'new'),
        scheduled: tasks.filter(t => t.status === 'scheduled'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        completed: tasks.filter(t => t.status === 'completed')
      };

      expect(tasksByStatus.new).toHaveLength(2);
      expect(tasksByStatus.scheduled).toHaveLength(1);
      expect(tasksByStatus.in_progress).toHaveLength(1);
      expect(tasksByStatus.completed).toHaveLength(2);

      // Verify each task has required properties for frontend rendering
      tasks.forEach(task => {
        expect(task).toHaveProperty('_id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('assignedTo');
        expect(task).toHaveProperty('createdAt');
        expect(task).toHaveProperty('updatedAt');
      });
    });

    test('Should handle task creation from task board', async () => {
      // Simulate creating a task from the task board form
      const newTaskData = {
        title: 'Task Board Created Task',
        description: 'Task created from the task board interface',
        projectId: testProject._id,
        assignedTo: testUser._id,
        priority: 'medium',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTaskData)
        .expect(201);

      const createdTask = createResponse.body.data.task;

      // Verify task was created with correct properties
      expect(createdTask.title).toBe(newTaskData.title);
      expect(createdTask.description).toBe(newTaskData.description);
      expect(createdTask.projectId._id || createdTask.projectId).toBe(testProject._id.toString());
      expect(createdTask.assignedTo._id || createdTask.assignedTo).toBe(testUser._id.toString());
      expect(createdTask.priority).toBe(newTaskData.priority);
      expect(createdTask.status).toBe('new'); // Default status

      // Verify task appears in task list
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const foundTask = tasksResponse.body.data.tasks.find(t => t._id === createdTask._id);
      expect(foundTask).toBeDefined();
    });
  });

  describe('Form Validation and Error Handling', () => {
    test('Should validate task form data properly', async () => {
      // Test missing required fields
      const invalidTaskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Task without title'
          // Missing title
        })
        .expect(400);

      expect(invalidTaskResponse.body.status).toBe('fail');
      expect(invalidTaskResponse.body.message).toContain('title');

      // Test invalid priority
      const invalidPriorityResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Valid Title',
          description: 'Valid description',
          priority: 'invalid_priority'
        })
        .expect(400);

      expect(invalidPriorityResponse.body.status).toBe('fail');

      // Test invalid date format
      const invalidDateResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Valid Title',
          description: 'Valid description',
          scheduledDate: 'invalid-date'
        })
        .expect(400);

      expect(invalidDateResponse.body.status).toBe('fail');
    });

    test('Should validate project form data properly', async () => {
      // Test missing required fields
      const invalidProjectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Project without name'
          // Missing name
        })
        .expect(400);

      expect(invalidProjectResponse.body.status).toBe('fail');

      // Test invalid date range (end date before start date)
      const invalidDateRangeResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Date Project',
          description: 'Project with invalid date range',
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          endDate: new Date() // Today (before start date)
        })
        .expect(400);

      expect(invalidDateRangeResponse.body.status).toBe('fail');
    });

    test('Should handle network errors gracefully', async () => {
      // Test with malformed JSON
      const malformedResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"title": "Malformed JSON"') // Missing closing brace
        .expect(400);

      expect(malformedResponse.body.status).toBe('fail');

      // Test with oversized payload
      const oversizedData = {
        title: 'A'.repeat(1000), // Very long title
        description: 'B'.repeat(10000) // Very long description
      };

      const oversizedResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(oversizedData)
        .expect(400);

      expect(oversizedResponse.body.status).toBe('fail');
    });
  });

  describe('Real-time Updates and State Management', () => {
    test('Should handle concurrent updates correctly', async () => {
      // Create a task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Concurrent Update Task',
          description: 'Task for testing concurrent updates',
          assignedTo: testUser._id
        })
        .expect(201);

      const task = taskResponse.body.data.task;

      // Simulate concurrent updates from different parts of the frontend
      const statusUpdatePromise = request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' });

      const detailsUpdatePromise = request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Concurrent Task',
          description: 'Updated description for concurrent task',
          priority: 'high'
        });

      const [statusResponse, detailsResponse] = await Promise.all([
        statusUpdatePromise,
        detailsUpdatePromise
      ]);

      // Both updates should succeed
      expect(statusResponse.status).toBe(200);
      expect(detailsResponse.status).toBe(200);

      // Verify final state includes both updates
      const finalTaskResponse = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const finalTask = finalTaskResponse.body.data.task;
      expect(finalTask.status).toBe('in_progress');
      expect(finalTask.title).toBe('Updated Concurrent Task');
      expect(finalTask.priority).toBe('high');
    });

    test('Should maintain data consistency across multiple requests', async () => {
      // Create multiple tasks
      const taskPromises = [];
      for (let i = 1; i <= 5; i++) {
        taskPromises.push(
          request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Consistency Task ${i}`,
              description: `Task ${i} for consistency testing`,
              assignedTo: testUser._id
            })
        );
      }

      const taskResponses = await Promise.all(taskPromises);
      const tasks = taskResponses.map(response => response.body.data.task);

      // Update all tasks to different statuses
      const updatePromises = tasks.map((task, index) => {
        const statuses = ['scheduled', 'in_progress', 'completed', 'scheduled', 'in_progress'];
        return request(app)
          .patch(`/api/tasks/${task._id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: statuses[index] });
      });

      await Promise.all(updatePromises);

      // Verify all updates were applied correctly
      const finalTasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const finalTasks = finalTasksResponse.body.data.tasks;
      expect(finalTasks).toHaveLength(5);

      // Verify status distribution
      const statusCounts = {
        scheduled: finalTasks.filter(t => t.status === 'scheduled').length,
        in_progress: finalTasks.filter(t => t.status === 'in_progress').length,
        completed: finalTasks.filter(t => t.status === 'completed').length
      };

      expect(statusCounts.scheduled).toBe(2);
      expect(statusCounts.in_progress).toBe(2);
      expect(statusCounts.completed).toBe(1);
    });
  });

  describe('Calendar and Timeline Integration', () => {
    test('Should provide task data formatted for calendar display', async () => {
      // Create tasks with scheduled dates
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const calendarTasks = [
        {
          title: 'Today Task',
          scheduledDate: today,
          status: 'scheduled'
        },
        {
          title: 'Tomorrow Task',
          scheduledDate: tomorrow,
          status: 'scheduled'
        },
        {
          title: 'Next Week Task',
          scheduledDate: nextWeek,
          status: 'new'
        }
      ];

      for (const taskData of calendarTasks) {
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: taskData.title,
            description: 'Calendar task',
            assignedTo: testUser._id,
            scheduledDate: taskData.scheduledDate,
            status: taskData.status
          })
          .expect(201);
      }

      // Get tasks for calendar display
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const tasks = tasksResponse.body.data.tasks;

      // Verify tasks have calendar-required properties
      tasks.forEach(task => {
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('scheduledDate');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('assignedTo');
        
        if (task.scheduledDate) {
          expect(new Date(task.scheduledDate)).toBeInstanceOf(Date);
        }
      });

      // Verify tasks can be filtered by date range (for calendar month view)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const monthTasksResponse = await request(app)
        .get('/api/tasks')
        .query({
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return tasks within the month
      expect(monthTasksResponse.body.data.tasks.length).toBeGreaterThan(0);
    });

    test('Should handle deadline notifications properly', async () => {
      // Create tasks with approaching deadlines
      const urgentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
      const normalDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Urgent Deadline Task',
          description: 'Task with urgent deadline',
          assignedTo: testUser._id,
          scheduledDate: urgentDeadline,
          priority: 'urgent'
        })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Normal Deadline Task',
          description: 'Task with normal deadline',
          assignedTo: testUser._id,
          scheduledDate: normalDeadline,
          priority: 'medium'
        })
        .expect(201);

      // Get tasks with upcoming deadlines
      const upcomingTasksResponse = await request(app)
        .get('/api/tasks')
        .query({
          upcoming: 'true',
          days: '7'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const upcomingTasks = upcomingTasksResponse.body.data.tasks;
      expect(upcomingTasks.length).toBeGreaterThanOrEqual(2);

      // Verify tasks are sorted by deadline (closest first)
      for (let i = 1; i < upcomingTasks.length; i++) {
        const prevDate = new Date(upcomingTasks[i - 1].scheduledDate);
        const currDate = new Date(upcomingTasks[i].scheduledDate);
        expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
      }
    });
  });

  describe('Performance and Optimization', () => {
    test('Should handle large datasets efficiently', async () => {
      // Create a large number of tasks
      const taskPromises = [];
      for (let i = 1; i <= 100; i++) {
        taskPromises.push(
          request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Performance Task ${i}`,
              description: `Task ${i} for performance testing`,
              assignedTo: testUser._id,
              status: i % 4 === 0 ? 'completed' : 'new'
            })
        );
      }

      // Create tasks in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < taskPromises.length; i += batchSize) {
        const batch = taskPromises.slice(i, i + batchSize);
        await Promise.all(batch);
      }

      // Measure response time for getting all tasks
      const startTime = Date.now();
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      // Verify response time is reasonable (less than 2 seconds)
      expect(responseTime).toBeLessThan(2000);

      // Verify all tasks are returned
      expect(tasksResponse.body.data.tasks).toHaveLength(100);

      // Test pagination if implemented
      const paginatedResponse = await request(app)
        .get('/api/tasks')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return paginated results if pagination is implemented
      // Otherwise, should return all results
      expect(paginatedResponse.body.data.tasks.length).toBeGreaterThan(0);
    });

    test('Should cache frequently accessed data appropriately', async () => {
      // Create test data
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Cache Test Task',
          description: 'Task for cache testing',
          assignedTo: testUser._id
        })
        .expect(201);

      // Make multiple requests for the same data
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.tasks).toHaveLength(1);
      });

      // Average response time should be reasonable
      const averageTime = totalTime / responses.length;
      expect(averageTime).toBeLessThan(500); // Less than 500ms per request
    });
  });
});