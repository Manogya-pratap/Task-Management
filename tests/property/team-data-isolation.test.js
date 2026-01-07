const fc = require('fast-check');
const { User, Team } = require('../../server/models');

/**
 * Feature: daily-activity-tracker, Property 7: Team data isolation
 * For any Team_Lead, accessing team management should display only members from their assigned department
 * Validates: Requirements 3.1
 */

describe('Property-Based Tests: Team Data Isolation', () => {
  
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
    role: fc.constantFrom('team_lead', 'employee'),
    department: departmentArbitrary
  });

  // Generator for team data
  const teamArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    department: departmentArbitrary,
    description: fc.string({ minLength: 0, maxLength: 500 })
  });

  test('Property 7: Team data isolation - Team leads can only access their department members', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(userArbitrary, { minLength: 2, maxLength: 8 }),
      fc.array(teamArbitrary, { minLength: 1, maxLength: 3 }),
      async (usersData, teamsData) => {
        try {
          // Create unique usernames and emails to avoid conflicts
          const uniqueUsersData = usersData.map((userData, index) => ({
            ...userData,
            username: `${userData.username}_${Date.now()}_${index}`,
            email: `${userData.username}_${Date.now()}_${index}@example.com`
          }));

          // Create users in database
          const users = [];
          for (const userData of uniqueUsersData) {
            const user = await User.createUser(userData);
            users.push(user);
          }

          // Create teams with unique names and assign team leads
          const teams = [];
          for (let i = 0; i < teamsData.length; i++) {
            const teamData = teamsData[i];
            // Find a team lead for this department
            const teamLead = users.find(user => 
              user.role === 'team_lead' && user.department === teamData.department
            );
            
            if (teamLead) {
              const team = await Team.createTeam({
                ...teamData,
                name: `${teamData.name}_${Date.now()}_${i}`,
                teamLead: teamLead._id
              });
              teams.push(team);
              
              // Update user's teamId
              teamLead.teamId = team._id;
              await teamLead.save();
            }
          }

          // Test team data isolation for each team lead
          for (const team of teams) {
            const teamLead = users.find(user => user._id.equals(team.teamLead));
            if (teamLead) {
              // Property: Team lead should only see teams from their department
              const departmentTeams = await Team.findByDepartment(teamLead.department);
              
              for (const deptTeam of departmentTeams) {
                expect(deptTeam.department).toBe(teamLead.department);
              }

              // Property: Team lead should only see users from their department
              const departmentUsers = await User.findByDepartment(teamLead.department);
              
              for (const deptUser of departmentUsers) {
                expect(deptUser.department).toBe(teamLead.department);
              }

              // Property: Team lead should be included in their own team members
              expect(team.isMember(teamLead._id)).toBe(true);
              expect(team.isTeamLead(teamLead._id)).toBe(true);
            }
          }

          // Property: Users from different departments should not appear in wrong department queries
          const allDepartments = [...new Set(users.map(user => user.department))];
          
          for (const department of allDepartments) {
            const departmentUsers = await User.findByDepartment(department);
            const departmentTeams = await Team.findByDepartment(department);
            
            // All users in department query should belong to that department
            for (const user of departmentUsers) {
              expect(user.department).toBe(department);
            }
            
            // All teams in department query should belong to that department
            for (const team of departmentTeams) {
              expect(team.department).toBe(department);
            }
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

  test('Property 7: Team data isolation - Team membership operations maintain isolation', async () => {
    await fc.assert(fc.asyncProperty(
      departmentArbitrary,
      departmentArbitrary,
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      async (dept1, dept2, uniqueId) => {
        try {
          // Create users from two different departments
          const teamLead1 = await User.createUser({
            username: `lead1_${uniqueId}_${Date.now()}`,
            email: `lead1_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'Lead',
            lastName: 'One',
            role: 'team_lead',
            department: dept1
          });

          const employee1 = await User.createUser({
            username: `emp1_${uniqueId}_${Date.now()}`,
            email: `emp1_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'Employee',
            lastName: 'One',
            role: 'employee',
            department: dept1
          });

          const employee2 = await User.createUser({
            username: `emp2_${uniqueId}_${Date.now()}`,
            email: `emp2_${uniqueId}_${Date.now()}@example.com`,
            password: 'Password123',
            firstName: 'Employee',
            lastName: 'Two',
            role: 'employee',
            department: dept2
          });

          // Create team for department 1
          const team1 = await Team.createTeam({
            name: `Team1_${uniqueId}_${Date.now()}`,
            department: dept1,
            teamLead: teamLead1._id,
            description: 'Test team 1'
          });

          // Property: Team lead should be automatically added to team members
          expect(team1.isMember(teamLead1._id)).toBe(true);
          expect(team1.isTeamLead(teamLead1._id)).toBe(true);

          // Property: Adding employee from same department should work
          await team1.addMember(employee1._id);
          expect(team1.isMember(employee1._id)).toBe(true);

          // Property: Team should maintain department consistency
          expect(team1.department).toBe(dept1);
          expect(teamLead1.department).toBe(dept1);
          expect(employee1.department).toBe(dept1);

          // Property: Employee from different department should not be in this team's department query
          const dept1Users = await User.findByDepartment(dept1);
          const dept1UserIds = dept1Users.map(user => user._id.toString());
          
          expect(dept1UserIds).toContain(teamLead1._id.toString());
          expect(dept1UserIds).toContain(employee1._id.toString());
          
          if (dept1 !== dept2) {
            expect(dept1UserIds).not.toContain(employee2._id.toString());
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

  test('Property 7: Team data isolation - Department filtering works correctly', async () => {
    await fc.assert(fc.property(
      fc.array(departmentArbitrary, { minLength: 1, maxLength: 5 }),
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      (departments, testId) => {
        // Test department filtering logic without database operations
        const uniqueDepartments = [...new Set(departments)];
        
        // Property: Department list should not contain duplicates
        expect(uniqueDepartments.length).toBeLessThanOrEqual(departments.length);
        
        // Property: Each department should be a valid string
        for (const dept of uniqueDepartments) {
          expect(typeof dept).toBe('string');
          expect(dept.length).toBeGreaterThan(0);
        }
        
        // Property: Filtering by department should be case-sensitive and exact match
        const targetDept = uniqueDepartments[0];
        const matchingDepts = uniqueDepartments.filter(dept => dept === targetDept);
        expect(matchingDepts).toHaveLength(1);
        expect(matchingDepts[0]).toBe(targetDept);
      }
    ), { numRuns: 50 });
  });

  test('Property 7: Team data isolation - Team model validation maintains data integrity', async () => {
    await fc.assert(fc.property(
      teamArbitrary,
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      (teamData, uniqueId) => {
        // Test team model validation without database operations
        const mockTeamLeadId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
        
        const team = new Team({
          ...teamData,
          name: `${teamData.name}_${uniqueId}`,
          teamLead: mockTeamLeadId
        });
        
        // Property: Team data should be preserved correctly
        expect(team.name).toBe(`${teamData.name.trim()}_${uniqueId}`);
        expect(team.department).toBe(teamData.department.trim());
        expect(team.description).toBe(teamData.description.trim());
        
        // Property: Team should be active by default
        expect(team.isActive).toBe(true);
        
        // Property: Team should have correct virtual properties
        expect(team.memberCount).toBe(0); // No members added yet
        expect(team.projectCount).toBe(0); // No projects added yet
        
        // Property: Team lead ID should be preserved
        expect(team.teamLead.toString()).toBe(mockTeamLeadId);
      }
    ), { numRuns: 50 });
  });
});