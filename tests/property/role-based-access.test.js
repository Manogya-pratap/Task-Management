const fc = require('fast-check');
const User = require('../../server/models/User');

/**
 * Feature: daily-activity-tracker, Property 2: Role-based access control
 * For any authenticated user, the system should grant access only to features and data appropriate to their role
 * (MD/IT_Admin get full access, Team_Lead gets team-specific access, Employee gets personal access only)
 * Validates: Requirements 1.3, 1.4, 1.5
 */

describe('Property-Based Tests: Role-Based Access Control', () => {
  
  // Generator for user roles
  const roleArbitrary = fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee');
  
  // Generator for permissions
  const permissionArbitrary = fc.constantFrom(
    'view_team_data',
    'create_project', 
    'assign_tasks',
    'manage_team_members',
    'view_own_tasks',
    'update_task_status',
    'view_assigned_projects',
    'delete_project',
    'admin_access'
  );

  // Generator for minimal user data
  const minimalUserArbitrary = fc.record({
    username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
    email: fc.emailAddress(),
    password: fc.string({ minLength: 6, maxLength: 50 }),
    firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    role: roleArbitrary,
    department: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
  });

  test('Property 2: MD and IT_Admin should have all permissions', async () => {
    await fc.assert(fc.asyncProperty(
      minimalUserArbitrary.filter(u => u.role === 'managing_director' || u.role === 'it_admin'),
      permissionArbitrary,
      async (userData, permission) => {
        // Create user
        const user = new User(userData);
        
        // Property: MD and IT_Admin should have all permissions
        expect(user.hasPermission(permission)).toBe(true);
        expect(user.hasPermission('*')).toBe(true);
      }
    ), { numRuns: 20 });
  }, 15000);

  test('Property 2: Team_Lead should have team-specific permissions only', async () => {
    await fc.assert(fc.asyncProperty(
      minimalUserArbitrary.filter(u => u.role === 'team_lead'),
      async (userData) => {
        // Create user
        const user = new User(userData);
        
        // Property: Team leads should have specific permissions
        expect(user.hasPermission('view_team_data')).toBe(true);
        expect(user.hasPermission('create_project')).toBe(true);
        expect(user.hasPermission('assign_tasks')).toBe(true);
        expect(user.hasPermission('manage_team_members')).toBe(true);
        expect(user.hasPermission('view_own_tasks')).toBe(true);
        expect(user.hasPermission('update_task_status')).toBe(true);
        expect(user.hasPermission('view_assigned_projects')).toBe(true);
        
        // Property: Team leads should NOT have admin permissions
        expect(user.hasPermission('*')).toBe(false);
        expect(user.hasPermission('admin_access')).toBe(false);
        expect(user.hasPermission('delete_project')).toBe(false);
      }
    ), { numRuns: 15 });
  }, 15000);

  test('Property 2: Employee should have personal permissions only', async () => {
    await fc.assert(fc.asyncProperty(
      minimalUserArbitrary.filter(u => u.role === 'employee'),
      async (userData) => {
        // Create user
        const user = new User(userData);
        
        // Property: Employees should have limited permissions
        expect(user.hasPermission('view_own_tasks')).toBe(true);
        expect(user.hasPermission('update_task_status')).toBe(true);
        expect(user.hasPermission('view_assigned_projects')).toBe(true);
        
        // Property: Employees should NOT have team or admin permissions
        expect(user.hasPermission('*')).toBe(false);
        expect(user.hasPermission('view_team_data')).toBe(false);
        expect(user.hasPermission('create_project')).toBe(false);
        expect(user.hasPermission('assign_tasks')).toBe(false);
        expect(user.hasPermission('manage_team_members')).toBe(false);
        expect(user.hasPermission('admin_access')).toBe(false);
      }
    ), { numRuns: 15 });
  }, 15000);

  test('Property 2: Role hierarchy is consistent', async () => {
    await fc.assert(fc.asyncProperty(minimalUserArbitrary, async (userData) => {
      // Create user
      const user = new User(userData);
      
      // Property: Role hierarchy should be consistent
      if (user.role === 'managing_director' || user.role === 'it_admin') {
        // Admins should have all permissions that team leads have
        expect(user.hasPermission('view_team_data')).toBe(true);
        expect(user.hasPermission('create_project')).toBe(true);
        expect(user.hasPermission('assign_tasks')).toBe(true);
        
        // And all permissions that employees have
        expect(user.hasPermission('view_own_tasks')).toBe(true);
        expect(user.hasPermission('update_task_status')).toBe(true);
        expect(user.hasPermission('view_assigned_projects')).toBe(true);
      }
      
      if (user.role === 'team_lead') {
        // Team leads should have all permissions that employees have
        expect(user.hasPermission('view_own_tasks')).toBe(true);
        expect(user.hasPermission('update_task_status')).toBe(true);
        expect(user.hasPermission('view_assigned_projects')).toBe(true);
      }
    }), { numRuns: 20 });
  }, 15000);

  test('Property 2: Permission system is deterministic', async () => {
    await fc.assert(fc.asyncProperty(
      minimalUserArbitrary,
      permissionArbitrary,
      async (userData, permission) => {
        // Create user
        const user = new User(userData);
        
        // Property: Permission check should be deterministic
        const result1 = user.hasPermission(permission);
        const result2 = user.hasPermission(permission);
        const result3 = user.hasPermission(permission);
        
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      }
    ), { numRuns: 25 });
  }, 15000);

  test('Property 2: Invalid roles should default to employee permissions', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
        !['managing_director', 'it_admin', 'team_lead', 'employee'].includes(s)
      ),
      async (invalidRole) => {
        // Create user with invalid role (this should be caught by validation, but test the permission logic)
        const userData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: invalidRole,
          department: 'Test'
        };
        
        const user = new User(userData);
        
        // Property: Invalid roles should not have any permissions
        expect(user.hasPermission('view_team_data')).toBe(false);
        expect(user.hasPermission('create_project')).toBe(false);
        expect(user.hasPermission('*')).toBe(false);
      }
    ), { numRuns: 10 });
  }, 15000);
});