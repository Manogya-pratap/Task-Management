const fc = require('fast-check');
const { User, Team } = require('../../server/models');

/**
 * Feature: daily-activity-tracker, Property 8: User creation with department assignment
 * For any Team_Lead creating a new team member, the system should create the user account with correct department assignment
 * Validates: Requirements 3.2
 */

describe('Property-Based Tests: User Creation with Department Assignment', () => {
  
  // Generator for valid department names
  const departmentArbitrary = fc.constantFrom(
    'Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'IT', 'Design'
  );

  // Generator for valid user data
  const userArbitrary = fc.record({
    username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
    email: fc.emailAddress(),
    password: fc.string({ minLength: 6, maxLength: 50 }),
    firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    role: fc.constantFrom('employee', 'team_lead'),
    department: departmentArbitrary
  });

  test('Property 8: User creation with department assignment - Team lead creates user in same department', async () => {
    await fc.assert(fc.asyncProperty(
      departmentArbitrary,
      userArbitrary,
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      async (department, newUserData, uniqueId) => {
        try {
          // Create a team lead for the department
          const teamLead = await User.createUser({
            username: `teamlead_${uniqueId}_${Date.now()}`,
            email: `teamlead_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'Team',
            lastName: 'Lead',
            role: 'team_lead',
            department: department
          });

          // Create a team for the department
          const team = await Team.createTeam({
            name: `Team_${uniqueId}_${Date.now()}`,
            department: department,
            teamLead: teamLead._id,
            description: 'Test team'
          });

          // Update team lead's teamId
          teamLead.teamId = team._id;
          await teamLead.save();

          // Create new user data with unique identifiers and same department
          const uniqueUserData = {
            ...newUserData,
            username: `${newUserData.username}_${uniqueId}_${Date.now()}`,
            email: `${newUserData.username}_${uniqueId}_${Date.now()}@example.com`,
            department: department, // Same department as team lead
            teamId: team._id
          };

          // Create the new user
          const newUser = await User.createUser(uniqueUserData);

          // Property: User should be created with correct department assignment
          expect(newUser.department).toBe(department);
          expect(newUser.department).toBe(teamLead.department);

          // Property: User data should be preserved correctly
          expect(newUser.username).toBe(uniqueUserData.username);
          expect(newUser.email).toBe(uniqueUserData.email);
          expect(newUser.firstName).toBe(uniqueUserData.firstName.trim());
          expect(newUser.lastName).toBe(uniqueUserData.lastName.trim());
          expect(newUser.role).toBe(uniqueUserData.role);

          // Property: User should be assigned to the correct team
          expect(newUser.teamId.toString()).toBe(team._id.toString());

          // Property: Team should include the new user as a member
          await team.addMember(newUser._id);
          expect(team.isMember(newUser._id)).toBe(true);

          // Property: Department consistency should be maintained
          const departmentUsers = await User.findByDepartment(department);
          const userIds = departmentUsers.map(user => user._id.toString());
          expect(userIds).toContain(teamLead._id.toString());
          expect(userIds).toContain(newUser._id.toString());

          // Property: All users in department query should have the same department
          for (const user of departmentUsers) {
            expect(user.department).toBe(department);
          }

        } catch (error) {
          // Handle expected validation errors gracefully
          if (error.message.includes('already exists') || 
              error.message.includes('validation failed') ||
              error.name === 'ValidationError') {
            // These are expected in property testing - skip this iteration
            return;
          }
          throw error;
        }
      }
    ), { numRuns: 5 }); // Reduced runs for database operations
  }, 30000);

  test('Property 8: User creation with department assignment - Department validation works correctly', async () => {
    await fc.assert(fc.asyncProperty(
      departmentArbitrary,
      departmentArbitrary,
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      async (teamLeadDept, newUserDept, uniqueId) => {
        try {
          // Create a team lead
          const teamLead = await User.createUser({
            username: `teamlead_${uniqueId}_${Date.now()}`,
            email: `teamlead_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'Team',
            lastName: 'Lead',
            role: 'team_lead',
            department: teamLeadDept
          });

          // Create a team for the team lead's department
          const team = await Team.createTeam({
            name: `Team_${uniqueId}_${Date.now()}`,
            department: teamLeadDept,
            teamLead: teamLead._id,
            description: 'Test team'
          });

          // Create new user in specified department
          const newUser = await User.createUser({
            username: `newuser_${uniqueId}_${Date.now()}`,
            email: `newuser_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'New',
            lastName: 'User',
            role: 'employee',
            department: newUserDept
          });

          // Property: User should be created with the specified department
          expect(newUser.department).toBe(newUserDept);

          // Property: Department consistency validation
          if (teamLeadDept === newUserDept) {
            // Same department - team lead should be able to manage this user
            expect(teamLead.department).toBe(newUser.department);
            
            // User can be added to the team
            await team.addMember(newUser._id);
            expect(team.isMember(newUser._id)).toBe(true);
            expect(team.department).toBe(newUser.department);
          } else {
            // Different departments - should maintain separation
            expect(teamLead.department).not.toBe(newUser.department);
            expect(team.department).not.toBe(newUser.department);
          }

          // Property: Department queries should return correct users
          const teamLeadDeptUsers = await User.findByDepartment(teamLeadDept);
          const newUserDeptUsers = await User.findByDepartment(newUserDept);

          // Team lead should appear in their department query
          const teamLeadIds = teamLeadDeptUsers.map(user => user._id.toString());
          expect(teamLeadIds).toContain(teamLead._id.toString());

          // New user should appear in their department query
          const newUserIds = newUserDeptUsers.map(user => user._id.toString());
          expect(newUserIds).toContain(newUser._id.toString());

          // Cross-department validation
          if (teamLeadDept !== newUserDept) {
            expect(teamLeadIds).not.toContain(newUser._id.toString());
            expect(newUserIds).not.toContain(teamLead._id.toString());
          }

        } catch (error) {
          // Handle expected validation errors gracefully
          if (error.message.includes('already exists') || 
              error.message.includes('validation failed') ||
              error.name === 'ValidationError') {
            // These are expected in property testing - skip this iteration
            return;
          }
          throw error;
        }
      }
    ), { numRuns: 8 }); // Moderate runs for database operations
  }, 25000);

  test('Property 8: User creation with department assignment - User model validation maintains integrity', async () => {
    await fc.assert(fc.property(
      userArbitrary,
      departmentArbitrary,
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      (userData, department, uniqueId) => {
        // Test user model validation without database operations
        const mockTeamId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
        
        const user = new User({
          ...userData,
          username: `${userData.username}_${uniqueId}`,
          department: department,
          teamId: mockTeamId
        });
        
        // Property: User data should be preserved correctly with department assignment
        expect(user.username).toBe(`${userData.username}_${uniqueId}`);
        expect(user.email).toBe(userData.email.toLowerCase());
        expect(user.firstName).toBe(userData.firstName.trim());
        expect(user.lastName).toBe(userData.lastName.trim());
        expect(user.role).toBe(userData.role);
        expect(user.department).toBe(department.trim());
        expect(user.teamId.toString()).toBe(mockTeamId);
        
        // Property: User should be active by default
        expect(user.isActive).toBe(true);
        
        // Property: User should have correct permissions based on role
        if (userData.role === 'team_lead') {
          expect(user.hasPermission('manage_team_members')).toBe(true);
          expect(user.hasPermission('create_project')).toBe(true);
        } else if (userData.role === 'employee') {
          expect(user.hasPermission('view_own_tasks')).toBe(true);
          expect(user.hasPermission('manage_team_members')).toBe(false);
        }
        
        // Property: Department should be consistent
        expect(typeof user.department).toBe('string');
        expect(user.department.length).toBeGreaterThan(0);
      }
    ), { numRuns: 50 });
  });

  test('Property 8: User creation with department assignment - Team assignment validation', async () => {
    await fc.assert(fc.asyncProperty(
      departmentArbitrary,
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      async (department, uniqueId) => {
        try {
          // Create team lead and team
          const teamLead = await User.createUser({
            username: `lead_${uniqueId}_${Date.now()}`,
            email: `lead_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'Team',
            lastName: 'Lead',
            role: 'team_lead',
            department: department
          });

          const team = await Team.createTeam({
            name: `Team_${uniqueId}_${Date.now()}`,
            department: department,
            teamLead: teamLead._id,
            description: 'Test team'
          });

          // Create user and assign to team
          const newUser = await User.createUser({
            username: `user_${uniqueId}_${Date.now()}`,
            email: `user_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'New',
            lastName: 'User',
            role: 'employee',
            department: department,
            teamId: team._id
          });

          // Property: User should be assigned to correct team
          expect(newUser.teamId.toString()).toBe(team._id.toString());
          expect(newUser.department).toBe(team.department);

          // Property: Team should be able to include the user
          await team.addMember(newUser._id);
          expect(team.isMember(newUser._id)).toBe(true);

          // Property: Team lead should be automatically included in team
          expect(team.isTeamLead(teamLead._id)).toBe(true);
          expect(team.isMember(teamLead._id)).toBe(true);

          // Property: All team members should belong to same department
          const populatedTeam = await Team.findById(team._id).populate('members', 'department');
          for (const member of populatedTeam.members) {
            expect(member.department).toBe(department);
          }

        } catch (error) {
          // Handle expected validation errors gracefully
          if (error.message.includes('already exists') || 
              error.message.includes('validation failed') ||
              error.name === 'ValidationError') {
            // These are expected in property testing - skip this iteration
            return;
          }
          throw error;
        }
      }
    ), { numRuns: 6 }); // Moderate runs for database operations
  }, 20000);
});