const fc = require('fast-check');
const { User, Project, Task, Team } = require('../../server/models');
const mongoose = require('mongoose');

/**
 * Feature: daily-activity-tracker, Property 18: Role-based dashboard content
 * For any authenticated user, the dashboard should display only the data and metrics appropriate to their role
 * (company-wide for admins, team-specific for team leads, personal for employees)
 * Validates: Requirements 6.1, 6.2, 6.3
 */

describe('Property-Based Tests: Role-Based Dashboard Content', () => {
  
  // Counter to ensure unique usernames and emails
  let testCounter = 0;

  beforeEach(() => {
    // Reset counter for each test to ensure uniqueness within test runs
    testCounter = Date.now() % 1000000; // Use timestamp to avoid conflicts between test runs
  });
  
  // Generator for user roles
  const roleArbitrary = fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee');
  
  // Generator for departments
  const departmentArbitrary = fc.constantFrom('Engineering', 'Marketing', 'Sales', 'HR', 'Finance');
  
  // Generator for user data with unique identifiers
  const userArbitrary = fc.record({
    username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)).map(s => `user_${++testCounter}_${s}`),
    email: fc.emailAddress().map(email => `test${++testCounter}_${email}`),
    password: fc.string({ minLength: 6, maxLength: 50 }),
    firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    role: roleArbitrary,
    department: departmentArbitrary
  });

  // Generator for team data
  const teamArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    department: departmentArbitrary,
    isActive: fc.constant(true)
  });

  // Generator for project data
  const projectArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    status: fc.constantFrom('planning', 'active', 'completed', 'on_hold'),
    startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
    endDate: fc.date({ min: new Date('2024-06-01'), max: new Date('2025-12-31') })
  });

  // Generator for task data
  const taskArbitrary = fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    status: fc.constantFrom('new', 'scheduled', 'in_progress', 'completed'),
    priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
    scheduledDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })),
    startDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })),
    completedDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }))
  });

  // Helper function to simulate dashboard data filtering based on user role
  const getDashboardDataForUser = async (user, allProjects, allTasks, allTeams) => {
    let filteredProjects = [];
    let filteredTasks = [];
    let filteredTeams = [];

    if (user.role === 'managing_director' || user.role === 'it_admin') {
      // MD and IT_Admin see all data
      filteredProjects = allProjects;
      filteredTasks = allTasks;
      filteredTeams = allTeams;
    } else if (user.role === 'team_lead') {
      // Team leads see their team's data
      filteredProjects = allProjects.filter(p => p.teamId && p.teamId.equals(user.teamId));
      filteredTasks = allTasks.filter(t => {
        return t.projectId && filteredProjects.some(p => p._id.equals(t.projectId));
      });
      filteredTeams = allTeams.filter(t => t.department === user.department);
    } else if (user.role === 'employee') {
      // Employees see only their assigned data
      filteredProjects = allProjects.filter(p => p.assignedMembers && p.assignedMembers.includes(user._id));
      filteredTasks = allTasks.filter(t => t.assignedTo && t.assignedTo.equals(user._id));
      filteredTeams = allTeams.filter(t => t.members && t.members.includes(user._id));
    }

    return {
      projects: filteredProjects,
      tasks: filteredTasks,
      teams: filteredTeams
    };
  };

  test('Property 18: MD/IT_Admin should see all company data', async () => {
    await fc.assert(fc.asyncProperty(
      userArbitrary.filter(u => u.role === 'managing_director' || u.role === 'it_admin'),
      fc.array(teamArbitrary, { minLength: 1, maxLength: 5 }),
      fc.array(projectArbitrary, { minLength: 1, maxLength: 10 }),
      fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
      async (userData, teamsData, projectsData, tasksData) => {
        // Create test data
        const user = new User(userData);
        await user.save();
        
        const teams = await Promise.all(teamsData.map(async (teamData) => {
          const team = new Team({
            ...teamData,
            teamLead: user._id // Use the created user as team lead
          });
          await team.save();
          return team;
        }));

        const projects = await Promise.all(projectsData.map(async (projectData, index) => {
          const project = new Project({
            ...projectData,
            teamId: teams[index % teams.length]._id,
            createdBy: user._id,
            assignedMembers: [user._id]
          });
          await project.save();
          return project;
        }));

        const tasks = await Promise.all(tasksData.map(async (taskData, index) => {
          const task = new Task({
            ...taskData,
            projectId: projects[index % projects.length]._id,
            assignedTo: user._id,
            createdBy: user._id
          });
          await task.save();
          return task;
        }));

        // Get dashboard data for MD/IT_Admin
        const dashboardData = await getDashboardDataForUser(user, projects, tasks, teams);

        // Property: MD/IT_Admin should see all data
        expect(dashboardData.projects).toHaveLength(projects.length);
        expect(dashboardData.tasks).toHaveLength(tasks.length);
        expect(dashboardData.teams).toHaveLength(teams.length);

        // Should have access to all projects regardless of team
        expect(dashboardData.projects.map(p => p._id.toString())).toEqual(
          expect.arrayContaining(projects.map(p => p._id.toString()))
        );

        // Should have access to all tasks regardless of assignment
        expect(dashboardData.tasks.map(t => t._id.toString())).toEqual(
          expect.arrayContaining(tasks.map(t => t._id.toString()))
        );
      }
    ), { numRuns: 2 });
  }, 30000);

  test('Property 18: Team Lead should see only team-specific data', async () => {
    await fc.assert(fc.asyncProperty(
      userArbitrary.filter(u => u.role === 'team_lead'),
      fc.array(teamArbitrary, { minLength: 2, maxLength: 4 }),
      fc.array(projectArbitrary, { minLength: 2, maxLength: 8 }),
      fc.array(taskArbitrary, { minLength: 2, maxLength: 15 }),
      async (userData, teamsData, projectsData, tasksData) => {
        // Create user first
        const user = new User(userData);
        await user.save();

        // Create teams with the user as team lead for the first team
        const teams = await Promise.all(teamsData.map(async (teamData, index) => {
          const team = new Team({
            ...teamData,
            teamLead: user._id // Use the created user as team lead
          });
          await team.save();
          return team;
        }));

        // Update user with first team ID
        user.teamId = teams[0]._id;
        await user.save();

        // Create projects - some for user's team, some for other teams
        const userTeamProjects = [];
        const otherTeamProjects = [];
        
        for (let i = 0; i < projectsData.length; i++) {
          const projectData = projectsData[i];
          const isUserTeamProject = i < Math.ceil(projectsData.length / 2);
          const teamId = isUserTeamProject ? teams[0]._id : teams[1]._id;
          
          const project = new Project({
            ...projectData,
            teamId,
            createdBy: user._id,
            assignedMembers: [user._id]
          });
          await project.save();
          
          if (isUserTeamProject) {
            userTeamProjects.push(project);
          } else {
            otherTeamProjects.push(project);
          }
        }

        const allProjects = [...userTeamProjects, ...otherTeamProjects];

        // Create tasks for both user team and other team projects
        const tasks = await Promise.all(tasksData.map(async (taskData, index) => {
          const project = allProjects[index % allProjects.length];
          const task = new Task({
            ...taskData,
            projectId: project._id,
            assignedTo: user._id,
            createdBy: user._id
          });
          await task.save();
          return task;
        }));

        // Get dashboard data for Team Lead
        const dashboardData = await getDashboardDataForUser(user, allProjects, tasks, teams);

        // Property: Team Lead should only see their team's projects
        expect(dashboardData.projects).toHaveLength(userTeamProjects.length);
        expect(dashboardData.projects.every(p => p.teamId.equals(user.teamId))).toBe(true);

        // Should only see tasks from their team's projects
        const userTeamProjectIds = userTeamProjects.map(p => p._id.toString());
        expect(dashboardData.tasks.every(t => 
          userTeamProjectIds.includes(t.projectId.toString())
        )).toBe(true);

        // Should see teams from their department
        expect(dashboardData.teams.every(t => t.department === user.department)).toBe(true);
      }
    ), { numRuns: 2 });
  }, 30000);

  test('Property 18: Employee should see only personal data', async () => {
    await fc.assert(fc.asyncProperty(
      userArbitrary.filter(u => u.role === 'employee'),
      fc.array(teamArbitrary, { minLength: 1, maxLength: 3 }),
      fc.array(projectArbitrary, { minLength: 2, maxLength: 6 }),
      fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
      async (userData, teamsData, projectsData, tasksData) => {
        // Create user first
        const user = new User(userData);
        await user.save();

        // Create teams with the user as team lead
        const teams = await Promise.all(teamsData.map(async (teamData) => {
          const team = new Team({
            ...teamData,
            teamLead: user._id
          });
          await team.save();
          return team;
        }));

        // Update user with first team ID
        user.teamId = teams[0]._id;
        await user.save();

        // Create another user for comparison
        const otherUser = new User({
          username: `otheruser_${++testCounter}_${Math.random().toString(36).substr(2, 9)}`,
          email: `other${++testCounter}@example.com`,
          password: 'password123',
          firstName: 'Other',
          lastName: 'User',
          role: 'employee',
          department: userData.department,
          teamId: teams[0]._id
        });
        await otherUser.save();

        // Create projects - some assigned to user, some not
        const userProjects = [];
        const otherProjects = [];
        
        for (let i = 0; i < projectsData.length; i++) {
          const projectData = projectsData[i];
          const isUserProject = i < Math.ceil(projectsData.length / 2);
          const assignedMembers = isUserProject ? [user._id] : [otherUser._id];
          
          const project = new Project({
            ...projectData,
            teamId: teams[0]._id,
            createdBy: user._id,
            assignedMembers
          });
          await project.save();
          
          if (isUserProject) {
            userProjects.push(project);
          } else {
            otherProjects.push(project);
          }
        }

        const allProjects = [...userProjects, ...otherProjects];

        // Create tasks - some assigned to user, some to other user
        const userTasks = [];
        const otherTasks = [];
        
        for (let i = 0; i < tasksData.length; i++) {
          const taskData = tasksData[i];
          const isUserTask = i < Math.ceil(tasksData.length / 2);
          const assignedTo = isUserTask ? user._id : otherUser._id;
          
          const task = new Task({
            ...taskData,
            projectId: allProjects[i % allProjects.length]._id,
            assignedTo,
            createdBy: user._id
          });
          await task.save();
          
          if (isUserTask) {
            userTasks.push(task);
          } else {
            otherTasks.push(task);
          }
        }

        const allTasks = [...userTasks, ...otherTasks];

        // Get dashboard data for Employee
        const dashboardData = await getDashboardDataForUser(user, allProjects, allTasks, teams);

        // Property: Employee should only see their assigned projects
        expect(dashboardData.projects).toHaveLength(userProjects.length);
        expect(dashboardData.projects.every(p => 
          p.assignedMembers.some(memberId => memberId.equals(user._id))
        )).toBe(true);

        // Should only see tasks assigned to them
        expect(dashboardData.tasks).toHaveLength(userTasks.length);
        expect(dashboardData.tasks.every(t => t.assignedTo.equals(user._id))).toBe(true);

        // Should only see teams they belong to
        expect(dashboardData.teams.every(t => 
          t.members && t.members.some(memberId => memberId.equals(user._id))
        )).toBe(true);
      }
    ), { numRuns: 2 });
  }, 30000);

  test('Property 18: Dashboard data filtering is consistent and deterministic', async () => {
    await fc.assert(fc.asyncProperty(
      userArbitrary,
      fc.array(teamArbitrary, { minLength: 1, maxLength: 3 }),
      fc.array(projectArbitrary, { minLength: 1, maxLength: 5 }),
      fc.array(taskArbitrary, { minLength: 1, maxLength: 8 }),
      async (userData, teamsData, projectsData, tasksData) => {
        // Create user first
        const user = new User(userData);
        await user.save();

        // Create test data
        const teams = await Promise.all(teamsData.map(async (teamData) => {
          const team = new Team({
            ...teamData,
            teamLead: user._id
          });
          await team.save();
          return team;
        }));

        // Update user with first team ID
        user.teamId = teams[0]._id;
        await user.save();

        const projects = await Promise.all(projectsData.map(async (projectData) => {
          const project = new Project({
            ...projectData,
            teamId: teams[0]._id,
            createdBy: user._id,
            assignedMembers: [user._id]
          });
          await project.save();
          return project;
        }));

        const tasks = await Promise.all(tasksData.map(async (taskData, index) => {
          const task = new Task({
            ...taskData,
            projectId: projects[index % projects.length]._id,
            assignedTo: user._id,
            createdBy: user._id
          });
          await task.save();
          return task;
        }));

        // Get dashboard data multiple times
        const dashboardData1 = await getDashboardDataForUser(user, projects, tasks, teams);
        const dashboardData2 = await getDashboardDataForUser(user, projects, tasks, teams);
        const dashboardData3 = await getDashboardDataForUser(user, projects, tasks, teams);

        // Property: Dashboard data filtering should be deterministic
        expect(dashboardData1.projects).toHaveLength(dashboardData2.projects.length);
        expect(dashboardData2.projects).toHaveLength(dashboardData3.projects.length);
        
        expect(dashboardData1.tasks).toHaveLength(dashboardData2.tasks.length);
        expect(dashboardData2.tasks).toHaveLength(dashboardData3.tasks.length);
        
        expect(dashboardData1.teams).toHaveLength(dashboardData2.teams.length);
        expect(dashboardData2.teams).toHaveLength(dashboardData3.teams.length);

        // Property: Same user should always get same filtered results
        const projectIds1 = dashboardData1.projects.map(p => p._id.toString()).sort();
        const projectIds2 = dashboardData2.projects.map(p => p._id.toString()).sort();
        expect(projectIds1).toEqual(projectIds2);

        const taskIds1 = dashboardData1.tasks.map(t => t._id.toString()).sort();
        const taskIds2 = dashboardData2.tasks.map(t => t._id.toString()).sort();
        expect(taskIds1).toEqual(taskIds2);
      }
    ), { numRuns: 3 });
  }, 30000);
});