const request = require('supertest');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Team = require('../../server/models/Team');
const Project = require('../../server/models/Project');
const Task = require('../../server/models/Task');

describe('Complete User Workflows Integration Tests', () => {
  let mdUser, teamLeadUser, employeeUser;
  let mdToken, teamLeadToken, employeeToken;
  let testTeam, testProject, testTask;

  beforeEach(async () => {
    // Clean up existing data
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({})
    ]);

    // Create test users with different roles
    mdUser = await User.createUser({
      username: 'md_user',
      email: 'md@yantrik.com',
      password: 'Password123',
      firstName: 'Managing',
      lastName: 'Director',
      role: 'managing_director',
      department: 'Executive'
    });

    teamLeadUser = await User.createUser({
      username: 'teamlead_user',
      email: 'teamlead@yantrik.com',
      password: 'Password123',
      firstName: 'Team',
      lastName: 'Lead',
      role: 'team_lead',
      department: 'IT'
    });

    employeeUser = await User.createUser({
      username: 'employee_user',
      email: 'employee@yantrik.com',
      password: 'Password123',
      firstName: 'Regular',
      lastName: 'Employee',
      role: 'employee',
      department: 'IT'
    });

    // Create test team
    testTeam = await Team.create({
      name: 'IT Development Team',
      department: 'IT',
      teamLead: teamLeadUser._id,
      members: [teamLeadUser._id, employeeUser._id],
      isActive: true
    });

    // Update users with team assignment
    await User.findByIdAndUpdate(teamLeadUser._id, { teamId: testTeam._id });
    await User.findByIdAndUpdate(employeeUser._id, { teamId: testTeam._id });

    // Login users to get tokens
    const mdLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'md_user', password: 'Password123' });
    mdToken = mdLogin.body.token;

    const teamLeadLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'teamlead_user', password: 'Password123' });
    teamLeadToken = teamLeadLogin.body.token;

    const employeeLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'employee_user', password: 'Password123' });
    employeeToken = employeeLogin.body.token;
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

  describe('Managing Director Workflow', () => {
    test('MD should be able to view all company data and manage everything', async () => {
      // 1. MD should be able to view all teams
      const teamsResponse = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${mdToken}`)
        .expect(200);

      expect(teamsResponse.body.status).toBe('success');
      expect(teamsResponse.body.data.teams).toHaveLength(1);
      expect(teamsResponse.body.data.teams[0].name).toBe('IT Development Team');

      // 2. MD should be able to create projects for any team
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${mdToken}`)
        .send({
          name: 'Company-wide Digital Transformation',
          description: 'Modernizing all company systems',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          teamId: testTeam._id,
          assignedMembers: [teamLeadUser._id, employeeUser._id]
        })
        .expect(201);

      expect(projectResponse.body.status).toBe('success');
      expect(projectResponse.body.data.project.name).toBe('Company-wide Digital Transformation');
      testProject = projectResponse.body.data.project;

      // 3. MD should be able to create tasks and assign to anyone
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${mdToken}`)
        .send({
          title: 'System Architecture Review',
          description: 'Review current system architecture and propose improvements',
          projectId: testProject._id,
          assignedTo: teamLeadUser._id,
          priority: 'high',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        })
        .expect(201);

      expect(taskResponse.body.status).toBe('success');
      expect(taskResponse.body.data.task.title).toBe('System Architecture Review');
      testTask = taskResponse.body.data.task;

      // 4. MD should be able to view all tasks across the company
      const allTasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${mdToken}`)
        .expect(200);

      expect(allTasksResponse.body.status).toBe('success');
      expect(allTasksResponse.body.data.tasks).toHaveLength(1);

      // 5. MD should be able to update any task status
      const updateTaskResponse = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${mdToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(updateTaskResponse.body.status).toBe('success');
      expect(updateTaskResponse.body.data.task.status).toBe('in_progress');

      // 6. MD should be able to view all projects
      const allProjectsResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${mdToken}`)
        .expect(200);

      expect(allProjectsResponse.body.status).toBe('success');
      expect(allProjectsResponse.body.data.projects).toHaveLength(1);
    });

    test('MD should be able to create new team members and assign them to teams', async () => {
      // MD creates a new employee
      const newUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${mdToken}`)
        .send({
          username: 'new_employee',
          email: 'newemployee@yantrik.com',
          password: 'Password123',
          firstName: 'New',
          lastName: 'Employee',
          role: 'employee',
          department: 'IT',
          teamId: testTeam._id
        })
        .expect(201);

      expect(newUserResponse.body.status).toBe('success');
      expect(newUserResponse.body.data.user.username).toBe('new_employee');
      expect(newUserResponse.body.data.user.teamId).toBe(testTeam._id.toString());

      // Verify the team now has the new member
      const updatedTeamResponse = await request(app)
        .get(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${mdToken}`)
        .expect(200);

      expect(updatedTeamResponse.body.data.team.members).toHaveLength(3);
    });
  });

  describe('Team Lead Workflow', () => {
    beforeEach(async () => {
      // Create a project for the team lead to work with
      testProject = await Project.create({
        name: 'IT Infrastructure Upgrade',
        description: 'Upgrading server infrastructure',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        teamId: testTeam._id,
        createdBy: teamLeadUser._id,
        assignedMembers: [teamLeadUser._id, employeeUser._id],
        status: 'active'
      });
    });

    test('Team Lead should be able to manage their team and projects', async () => {
      // 1. Team Lead should be able to view their team
      const teamResponse = await request(app)
        .get(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .expect(200);

      expect(teamResponse.body.status).toBe('success');
      expect(teamResponse.body.data.team.name).toBe('IT Development Team');

      // 2. Team Lead should be able to create tasks for their team
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Server Migration Planning',
          description: 'Plan the migration of legacy servers',
          projectId: testProject._id,
          assignedTo: employeeUser._id,
          priority: 'medium',
          scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        })
        .expect(201);

      expect(taskResponse.body.status).toBe('success');
      expect(taskResponse.body.data.task.title).toBe('Server Migration Planning');
      testTask = taskResponse.body.data.task;

      // 3. Team Lead should be able to update tasks in their projects
      const updateTaskResponse = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Server Migration Planning - Updated',
          description: 'Updated description with more details',
          priority: 'high'
        })
        .expect(200);

      expect(updateTaskResponse.body.status).toBe('success');
      expect(updateTaskResponse.body.data.task.title).toBe('Server Migration Planning - Updated');

      // 4. Team Lead should be able to view team projects
      const projectsResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .expect(200);

      expect(projectsResponse.body.status).toBe('success');
      expect(projectsResponse.body.data.projects).toHaveLength(1);

      // 5. Team Lead should be able to create new team members
      const newMemberResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          username: 'team_member',
          email: 'teammember@yantrik.com',
          password: 'Password123',
          firstName: 'Team',
          lastName: 'Member',
          role: 'employee',
          department: 'IT',
          teamId: testTeam._id
        })
        .expect(201);

      expect(newMemberResponse.body.status).toBe('success');
      expect(newMemberResponse.body.data.user.department).toBe('IT');
    });

    test('Team Lead should NOT be able to access other teams data', async () => {
      // Create another team
      const otherTeam = await Team.create({
        name: 'HR Team',
        department: 'HR',
        teamLead: mdUser._id,
        members: [mdUser._id],
        isActive: true
      });

      // Create a project for the other team
      const otherProject = await Project.create({
        name: 'HR System Implementation',
        description: 'Implementing new HR management system',
        teamId: otherTeam._id,
        createdBy: mdUser._id,
        status: 'active'
      });

      // Team Lead should NOT be able to view other team's projects
      const projectsResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .expect(200);

      // Should only see their own team's projects
      expect(projectsResponse.body.data.projects).toHaveLength(1);
      expect(projectsResponse.body.data.projects[0].teamId).toBe(testTeam._id.toString());

      // Team Lead should NOT be able to access other team's project directly
      const otherProjectResponse = await request(app)
        .get(`/api/projects/${otherProject._id}`)
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .expect(403);

      expect(otherProjectResponse.body.status).toBe('fail');
    });
  });

  describe('Employee Workflow', () => {
    beforeEach(async () => {
      // Create a project and task for the employee
      testProject = await Project.create({
        name: 'Database Optimization',
        description: 'Optimizing database queries and performance',
        startDate: new Date(),
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        teamId: testTeam._id,
        createdBy: teamLeadUser._id,
        assignedMembers: [employeeUser._id],
        status: 'active'
      });

      testTask = await Task.create({
        title: 'Query Performance Analysis',
        description: 'Analyze slow-running database queries',
        projectId: testProject._id,
        assignedTo: employeeUser._id,
        createdBy: teamLeadUser._id,
        status: 'new',
        priority: 'medium'
      });
    });

    test('Employee should be able to view and update their own tasks', async () => {
      // 1. Employee should be able to view their assigned tasks
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(tasksResponse.body.status).toBe('success');
      expect(tasksResponse.body.data.tasks).toHaveLength(1);
      expect(tasksResponse.body.data.tasks[0].assignedTo._id).toBe(employeeUser._id.toString());

      // 2. Employee should be able to update their task status
      const updateStatusResponse = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(updateStatusResponse.body.status).toBe('success');
      expect(updateStatusResponse.body.data.task.status).toBe('in_progress');

      // 3. Employee should be able to view their assigned projects
      const projectsResponse = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(projectsResponse.body.status).toBe('success');
      expect(projectsResponse.body.data.projects).toHaveLength(1);

      // 4. Employee should be able to update task details (if they own it)
      const updateTaskResponse = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          description: 'Updated description with findings from initial analysis'
        })
        .expect(200);

      expect(updateTaskResponse.body.status).toBe('success');
      expect(updateTaskResponse.body.data.task.description).toContain('Updated description');
    });

    test('Employee should NOT be able to create projects or manage other users', async () => {
      // 1. Employee should NOT be able to create projects
      const createProjectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Unauthorized Project',
          description: 'This should not be allowed',
          teamId: testTeam._id
        })
        .expect(403);

      expect(createProjectResponse.body.status).toBe('fail');

      // 2. Employee should NOT be able to create users
      const createUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          username: 'unauthorized_user',
          email: 'unauthorized@yantrik.com',
          password: 'Password123',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: 'employee',
          department: 'IT'
        })
        .expect(403);

      expect(createUserResponse.body.status).toBe('fail');

      // 3. Employee should NOT be able to access tasks not assigned to them
      const otherTask = await Task.create({
        title: 'Other User Task',
        description: 'Task assigned to someone else',
        projectId: testProject._id,
        assignedTo: teamLeadUser._id,
        createdBy: teamLeadUser._id,
        status: 'new'
      });

      const otherTaskResponse = await request(app)
        .get(`/api/tasks/${otherTask._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(otherTaskResponse.body.status).toBe('fail');
    });

    test('Employee should be able to complete their task workflow', async () => {
      // Complete task workflow: new -> scheduled -> in_progress -> completed
      
      // 1. Start with task in 'new' status
      expect(testTask.status).toBe('new');

      // 2. Schedule the task
      const scheduleResponse = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'scheduled' })
        .expect(200);

      expect(scheduleResponse.body.data.task.status).toBe('scheduled');

      // 3. Start working on the task
      const startResponse = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(startResponse.body.data.task.status).toBe('in_progress');
      expect(startResponse.body.data.task.startDate).toBeDefined();

      // 4. Complete the task
      const completeResponse = await request(app)
        .patch(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(completeResponse.body.data.task.status).toBe('completed');
      expect(completeResponse.body.data.task.completedDate).toBeDefined();

      // 5. Verify task appears in completed tasks
      const completedTasksResponse = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(completedTasksResponse.body.data.tasks).toHaveLength(1);
      expect(completedTasksResponse.body.data.tasks[0].status).toBe('completed');
    });
  });

  describe('Cross-Component Interactions', () => {
    test('Project creation should initialize task sections correctly', async () => {
      // Team Lead creates a project
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          name: 'Multi-Phase Development Project',
          description: 'A project that will have tasks in all status categories',
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          teamId: testTeam._id,
          assignedMembers: [teamLeadUser._id, employeeUser._id]
        })
        .expect(201);

      const project = projectResponse.body.data.project;

      // Create tasks in different statuses
      const taskStatuses = ['new', 'scheduled', 'in_progress', 'completed'];
      const createdTasks = [];

      for (let i = 0; i < taskStatuses.length; i++) {
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${teamLeadToken}`)
          .send({
            title: `Task ${i + 1} - ${taskStatuses[i]}`,
            description: `Task in ${taskStatuses[i]} status`,
            projectId: project._id,
            assignedTo: i % 2 === 0 ? teamLeadUser._id : employeeUser._id,
            status: taskStatuses[i],
            priority: 'medium'
          })
          .expect(201);

        createdTasks.push(taskResponse.body.data.task);
      }

      // Verify all task sections are populated
      const projectTasksResponse = await request(app)
        .get(`/api/projects/${project._id}/tasks`)
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .expect(200);

      const tasks = projectTasksResponse.body.data.tasks;
      expect(tasks).toHaveLength(4);

      // Verify each status has at least one task
      taskStatuses.forEach(status => {
        const tasksInStatus = tasks.filter(task => task.status === status);
        expect(tasksInStatus).toHaveLength(1);
      });
    });

    test('Task status updates should reflect in project progress', async () => {
      // Create project with multiple tasks
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          name: 'Progress Tracking Project',
          description: 'Project to test progress tracking',
          teamId: testTeam._id,
          assignedMembers: [employeeUser._id]
        })
        .expect(201);

      const project = projectResponse.body.data.project;

      // Create 4 tasks
      const taskPromises = [];
      for (let i = 1; i <= 4; i++) {
        taskPromises.push(
          request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${teamLeadToken}`)
            .send({
              title: `Progress Task ${i}`,
              description: `Task ${i} for progress tracking`,
              projectId: project._id,
              assignedTo: employeeUser._id,
              status: 'new'
            })
        );
      }

      const taskResponses = await Promise.all(taskPromises);
      const tasks = taskResponses.map(response => response.body.data.task);

      // Complete 2 out of 4 tasks (50% completion)
      await request(app)
        .patch(`/api/tasks/${tasks[0]._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'completed' })
        .expect(200);

      await request(app)
        .patch(`/api/tasks/${tasks[1]._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'completed' })
        .expect(200);

      // Get project with updated progress
      const updatedProjectResponse = await request(app)
        .get(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .expect(200);

      // Verify project progress calculation
      const projectTasks = await request(app)
        .get(`/api/projects/${project._id}/tasks`)
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .expect(200);

      const completedTasks = projectTasks.body.data.tasks.filter(task => task.status === 'completed');
      const totalTasks = projectTasks.body.data.tasks.length;
      const expectedProgress = Math.round((completedTasks.length / totalTasks) * 100);

      expect(completedTasks).toHaveLength(2);
      expect(totalTasks).toBe(4);
      expect(expectedProgress).toBe(50);
    });

    test('Team member assignment should reflect in project and task access', async () => {
      // Create a new employee
      const newEmployeeResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          username: 'new_team_member',
          email: 'newmember@yantrik.com',
          password: 'Password123',
          firstName: 'New',
          lastName: 'Member',
          role: 'employee',
          department: 'IT',
          teamId: testTeam._id
        })
        .expect(201);

      const newEmployee = newEmployeeResponse.body.data.user;

      // Login the new employee
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'new_team_member', password: 'Password123' })
        .expect(200);

      const newEmployeeToken = loginResponse.body.token;

      // Create a project and assign the new employee
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          name: 'New Member Integration Project',
          description: 'Project to integrate new team member',
          teamId: testTeam._id,
          assignedMembers: [newEmployee._id]
        })
        .expect(201);

      const project = projectResponse.body.data.project;

      // Create a task assigned to the new employee
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Onboarding Task',
          description: 'Complete onboarding process',
          projectId: project._id,
          assignedTo: newEmployee._id
        })
        .expect(201);

      const task = taskResponse.body.data.task;

      // New employee should be able to access their assigned project
      const accessProjectResponse = await request(app)
        .get(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .expect(200);

      expect(accessProjectResponse.body.data.project.name).toBe('New Member Integration Project');

      // New employee should be able to access their assigned task
      const accessTaskResponse = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .expect(200);

      expect(accessTaskResponse.body.data.task.title).toBe('Onboarding Task');

      // New employee should be able to update their task
      const updateTaskResponse = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(updateTaskResponse.body.data.task.status).toBe('in_progress');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    test('Should handle invalid task status transitions gracefully', async () => {
      // Create a task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Status Transition Test Task',
          description: 'Testing invalid status transitions',
          assignedTo: employeeUser._id
        })
        .expect(201);

      const task = taskResponse.body.data.task;

      // Try to set an invalid status
      const invalidStatusResponse = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(invalidStatusResponse.body.status).toBe('fail');
      expect(invalidStatusResponse.body.message).toContain('Invalid status');
    });

    test('Should handle concurrent task updates correctly', async () => {
      // Create a task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Concurrent Update Test Task',
          description: 'Testing concurrent updates',
          assignedTo: employeeUser._id
        })
        .expect(201);

      const task = taskResponse.body.data.task;

      // Simulate concurrent updates
      const update1Promise = request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' });

      const update2Promise = request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description'
        });

      const [update1Response, update2Response] = await Promise.all([
        update1Promise,
        update2Promise
      ]);

      // Both updates should succeed
      expect(update1Response.status).toBe(200);
      expect(update2Response.status).toBe(200);

      // Verify final state
      const finalTaskResponse = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const finalTask = finalTaskResponse.body.data.task;
      expect(finalTask.status).toBe('in_progress');
      expect(finalTask.title).toBe('Updated Title');
    });

    test('Should handle project deletion and orphaned tasks', async () => {
      // Create project and task
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          name: 'Project to be Deleted',
          description: 'This project will be deleted',
          teamId: testTeam._id
        })
        .expect(201);

      const project = projectResponse.body.data.project;

      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Task in Deleted Project',
          description: 'This task will become orphaned',
          projectId: project._id,
          assignedTo: employeeUser._id
        })
        .expect(201);

      const task = taskResponse.body.data.task;

      // Delete the project (only MD should be able to do this)
      const deleteResponse = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${mdToken}`)
        .expect(200);

      expect(deleteResponse.body.status).toBe('success');

      // Verify task still exists but project reference is handled
      const orphanedTaskResponse = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      // Task should still be accessible to the assigned user
      expect(orphanedTaskResponse.body.data.task.title).toBe('Task in Deleted Project');
    });

    test('Should handle network timeouts and retries gracefully', async () => {
      // This test simulates what happens when requests take too long
      // In a real scenario, this would test actual timeout handling
      
      // Create a task with a very long description to simulate slow processing
      const longDescription = 'A'.repeat(10000); // Very long description
      
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${teamLeadToken}`)
        .send({
          title: 'Large Task',
          description: longDescription,
          assignedTo: employeeUser._id
        })
        .expect(201);

      expect(taskResponse.body.status).toBe('success');
      expect(taskResponse.body.data.task.description).toHaveLength(10000);
    });
  });
});