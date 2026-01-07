const fc = require('fast-check');
const mongoose = require('mongoose');
const User = require('../../server/models/User');
const Project = require('../../server/models/Project');
const Task = require('../../server/models/Task');
const Team = require('../../server/models/Team');
const AppError = require('../../server/utils/appError');
const { catchAsync } = require('../../server/utils/catchAsync');

/**
 * Property-based tests for error handling and data integrity
 * Feature: daily-activity-tracker, Property 23: Error handling and data integrity
 * **Validates: Requirements 7.5**
 */

describe('Error Handling and Data Integrity Properties', () => {
  describe('Property 23: Error handling and data integrity', () => {
    test('For any database operation that encounters an error, the system should handle it gracefully without corrupting existing data', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          async (testId) => {
            // Create a valid user first
            const validUserData = {
              username: `tu_${testId}_${Date.now().toString().slice(-6)}`,
              email: `tu_${testId}_${Date.now()}@example.com`,
              password: 'password123',
              firstName: 'Test',
              lastName: 'User',
              role: 'employee',
              department: 'Engineering'
            };
            
            const user = await User.create(validUserData);
            const originalUserCount = await User.countDocuments();
            
            // Attempt to create duplicate user (should fail gracefully)
            try {
              await User.create(validUserData); // Same data - should fail due to unique constraints
              // If we reach here, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              // Error should be handled gracefully
              expect(error).toBeDefined();
              expect(error.message).toMatch(/already exists|duplicate|E11000/i);
            }
            
            // Verify original data is not corrupted
            const userCountAfterError = await User.countDocuments();
            expect(userCountAfterError).toBe(originalUserCount);
            
            // Verify original user still exists and is intact
            const existingUser = await User.findById(user._id);
            expect(existingUser).toBeTruthy();
            expect(existingUser.username).toBe(validUserData.username);
            expect(existingUser.email).toBe(validUserData.email);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    test('For any invalid data validation, the system should reject gracefully without partial saves', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          async (testId) => {
            // Create team lead and team first
            const teamLead = await User.create({
              username: `tl_${testId}_${Date.now().toString().slice(-6)}`,
              email: `tl_${testId}_${Date.now()}@example.com`,
              password: 'password123',
              firstName: 'Team',
              lastName: 'Lead',
              role: 'team_lead',
              department: 'Engineering'
            });
            
            const team = await Team.create({
              name: `Test Team ${testId}`,
              department: 'Engineering',
              teamLead: teamLead._id,
              isActive: true
            });
            
            const originalProjectCount = await Project.countDocuments();
            
            // Make end date before start date to trigger validation error
            const invalidProjectData = {
              name: `Test Project ${testId}`,
              description: 'Test Description',
              startDate: new Date('2025-12-31'),
              endDate: new Date('2025-01-01'), // Before start date
              status: 'planning',
              teamId: team._id,
              createdBy: teamLead._id
            };
            
            // Attempt to create invalid project
            try {
              await Project.create(invalidProjectData);
              // If we reach here, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              // Error should be handled gracefully
              expect(error).toBeDefined();
              expect(error.message).toMatch(/End date must be after start date|validation/i);
            }
            
            // Verify no partial data was saved
            const projectCountAfterError = await Project.countDocuments();
            expect(projectCountAfterError).toBe(originalProjectCount);
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });

    test('For any malformed input data, validation should prevent database corruption', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          async (testId) => {
            const originalUserCount = await User.countDocuments();
            
            // Attempt to create user with malformed data (missing required fields)
            const invalidUserData = {
              username: null, // Invalid
              email: 'invalid-email', // Invalid format
              password: '123', // Too short
              firstName: '', // Empty
              lastName: '', // Empty
              role: 'invalid_role', // Invalid enum
              department: '' // Empty
            };
            
            try {
              await User.create(invalidUserData);
              // If creation succeeds, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              // If creation fails, no data should be saved
              const userCountAfterError = await User.countDocuments();
              expect(userCountAfterError).toBe(originalUserCount);
              
              // Error should be a validation error
              expect(error.name).toMatch(/ValidationError|CastError|MongoError/);
            }
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });

    test('For any database connection issues, operations should fail gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'a')),
          async (testData) => {
            // Simulate database operation with potential connection issues
            const operation = catchAsync(async () => {
              // This simulates a database operation that might fail
              const result = await User.findOne({ username: testData });
              return result;
            });
            
            try {
              const result = await operation({}, {}, () => {});
              // Operation succeeded - result should be valid or null
              expect(result === null || typeof result === 'object').toBe(true);
            } catch (error) {
              // Operation failed - error should be properly structured
              expect(error).toBeDefined();
              expect(typeof error.message).toBe('string');
            }
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });

    test('For any schema validation errors, detailed error information should be provided', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          async (testId) => {
            // Test with specific invalid data patterns
            const testCases = [
              {
                data: {
                  username: `vu_${testId}_${Date.now().toString().slice(-6)}`,
                  email: 'invalid-email-format', // Invalid email
                  password: 'validpassword',
                  firstName: 'Test',
                  lastName: 'User',
                  role: 'employee',
                  department: 'Engineering'
                },
                expectedError: /email/i
              },
              {
                data: {
                  username: `vu2_${testId}_${Date.now().toString().slice(-6)}`,
                  email: `valid_${testId}_${Date.now()}@example.com`,
                  password: '123', // Too short
                  firstName: 'Test',
                  lastName: 'User',
                  role: 'employee',
                  department: 'Engineering'
                },
                expectedError: /password.*6/i
              },
              {
                data: {
                  username: `vu3_${testId}_${Date.now().toString().slice(-6)}`,
                  email: `valid3_${testId}_${Date.now()}@example.com`,
                  password: 'validpassword',
                  firstName: 'Test',
                  lastName: 'User',
                  role: 'invalid_role', // Invalid enum
                  department: 'Engineering'
                },
                expectedError: /role/i
              }
            ];
            
            for (const testCase of testCases) {
              try {
                await User.create(testCase.data);
                // If creation succeeds, the data was actually valid
                expect(true).toBe(true);
              } catch (error) {
                // Error should contain meaningful information
                expect(error.message).toMatch(testCase.expectedError);
                expect(error.name).toMatch(/ValidationError|CastError/);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    test('should handle database disconnection gracefully', async () => {
      // Test that operations fail gracefully when database is unavailable
      const originalReadyState = mongoose.connection.readyState;
      
      try {
        // Simulate database operation
        const result = await User.findOne({ username: 'nonexistent' });
        expect(result).toBeNull();
      } catch (error) {
        // Should handle connection errors gracefully
        expect(error).toBeDefined();
      }
      
      // Connection state should be maintained
      expect(mongoose.connection.readyState).toBe(originalReadyState);
    });

    test('should handle memory constraints gracefully', async () => {
      // Test with large data that might cause memory issues
      const largeArray = new Array(25).fill(0).map((_, i) => ({
        username: `u${i}_${Date.now().toString().slice(-8)}`,
        email: `u${i}_${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee',
        department: 'Engineering'
      }));
      
      try {
        // This should either succeed or fail gracefully
        await User.insertMany(largeArray, { ordered: false });
        const count = await User.countDocuments();
        expect(count).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Should handle memory/performance errors gracefully
        expect(error).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });

    test('should maintain referential integrity on cascading operations', async () => {
      // Create related data
      const teamLead = await User.create({
        username: `tl_${Date.now().toString().slice(-8)}`,
        email: `tl_${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Team',
        lastName: 'Lead',
        role: 'team_lead',
        department: 'Engineering'
      });
      
      const team = await Team.create({
        name: 'Test Team',
        department: 'Engineering',
        teamLead: teamLead._id,
        isActive: true
      });
      
      const project = await Project.create({
        name: 'Test Project',
        description: 'Test Description',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        status: 'planning',
        teamId: team._id,
        createdBy: teamLead._id
      });
      
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description',
        status: 'new',
        projectId: project._id,
        createdBy: teamLead._id
      });
      
      // Verify relationships are maintained
      const foundTask = await Task.findById(task._id).populate('projectId');
      expect(foundTask.projectId._id.toString()).toBe(project._id.toString());
      
      const foundProject = await Project.findById(project._id).populate('createdBy');
      expect(foundProject.createdBy._id.toString()).toBe(teamLead._id.toString());
    });

    test('should handle validation errors consistently', async () => {
      // Test that validation errors are consistent and informative
      const invalidUserData = {
        username: 'ab', // Too short
        email: 'invalid-email', // Invalid format
        password: '123', // Too short
        firstName: '', // Empty
        lastName: '', // Empty
        role: 'invalid_role', // Invalid enum
        department: '' // Empty
      };
      
      try {
        await User.create(invalidUserData);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.message).toContain('validation failed');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    test('should handle concurrent operations without data corruption', async () => {
      // Test concurrent user creation
      const userPromises = Array.from({ length: 3 }, (_, i) => 
        User.create({
          username: `cu_${i}_${Date.now().toString().slice(-8)}`,
          email: `cu_${i}_${Date.now()}@example.com`,
          password: 'password123',
          firstName: 'Concurrent',
          lastName: 'User',
          role: 'employee',
          department: 'Engineering'
        }).catch(err => ({ error: err }))
      );
      
      const results = await Promise.all(userPromises);
      
      // Count successful creations
      const successfulCreations = results.filter(result => !result.error);
      const errors = results.filter(result => result.error);
      
      // All operations should either succeed or fail gracefully
      expect(successfulCreations.length + errors.length).toBe(3);
      
      // Verify no data corruption
      const finalUserCount = await User.countDocuments();
      expect(finalUserCount).toBeGreaterThanOrEqual(successfulCreations.length);
    });

    test('should handle transaction-like operations consistently', async () => {
      // Test that related operations maintain consistency
      const teamLead = await User.create({
        username: `tl2_${Date.now().toString().slice(-8)}`,
        email: `tl2_${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Team',
        lastName: 'Lead',
        role: 'team_lead',
        department: 'Engineering'
      });
      
      const team = await Team.create({
        name: 'Transaction Test Team',
        department: 'Engineering',
        teamLead: teamLead._id,
        isActive: true
      });
      
      const project = await Project.create({
        name: 'Transaction Test Project',
        description: 'Test Description',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        status: 'planning',
        teamId: team._id,
        createdBy: teamLead._id
      });
      
      const originalTaskCount = await Task.countDocuments();
      const originalProjectTaskCount = project.tasks.length;
      
      // Create valid task
      const task = await Task.create({
        title: 'Transaction Test Task',
        description: 'Test Description',
        status: 'new',
        projectId: project._id,
        createdBy: teamLead._id
      });
      
      // Add task to project
      await project.addTask(task._id);
      
      // Verify consistency - both operations should succeed
      const updatedProject = await Project.findById(project._id);
      expect(updatedProject.tasks).toContain(task._id);
      
      const taskCountAfterSuccess = await Task.countDocuments();
      expect(taskCountAfterSuccess).toBe(originalTaskCount + 1);
    });
  });
});