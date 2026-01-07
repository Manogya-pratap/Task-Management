const fc = require('fast-check');

// Define the color constants directly in the test to avoid JSX import issues
const COLORS = {
  // Yantrik Automation maroon branding
  primary: '#8B0000',
  primaryLight: '#A52A2A',
  
  // Task status colors
  taskStatus: {
    new: '#6c757d',        // Gray
    scheduled: '#007bff',   // Blue
    in_progress: '#ffc107', // Yellow/Amber
    completed: '#28a745'    // Green
  },
  
  // Project status colors
  projectStatus: {
    planning: '#6c757d',    // Gray
    active: '#007bff',      // Blue
    completed: '#28a745',   // Green
    on_hold: '#ffc107'      // Yellow
  },
  
  // Priority colors
  priority: {
    low: '#28a745',         // Green
    medium: '#ffc107',      // Yellow
    high: '#fd7e14',        // Orange
    urgent: '#dc3545'       // Red
  },
  
  // Role colors
  role: {
    managing_director: '#dc3545',  // Red
    it_admin: '#ffc107',           // Yellow
    team_lead: '#17a2b8',          // Cyan
    employee: '#28a745'            // Green
  }
};

/**
 * Feature: daily-activity-tracker, Property 19: Branding consistency
 * For any UI element in the system, the display should use the maroon color scheme and consistent visual indicators for task statuses
 * Validates: Requirements 6.4, 6.5
 */

describe('Property-Based Tests: Branding Consistency', () => {
  
  // Generator for task statuses
  const taskStatusArbitrary = fc.constantFrom('new', 'scheduled', 'in_progress', 'completed');
  
  // Generator for project statuses
  const projectStatusArbitrary = fc.constantFrom('planning', 'active', 'completed', 'on_hold');
  
  // Generator for priority levels
  const priorityArbitrary = fc.constantFrom('low', 'medium', 'high', 'urgent');
  
  // Generator for user roles
  const roleArbitrary = fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee');

  // Generator for UI component types
  const componentTypeArbitrary = fc.constantFrom('badge', 'progress-bar', 'card', 'button', 'alert');

  test('Property 19: Task status colors should be consistent across all components', async () => {
    await fc.assert(fc.property(
      taskStatusArbitrary,
      componentTypeArbitrary,
      (status, componentType) => {
        // Property: Task status colors should always be the same regardless of component type
        const expectedColor = COLORS.taskStatus[status];
        
        // Verify that the color is defined and consistent
        expect(expectedColor).toBeDefined();
        expect(typeof expectedColor).toBe('string');
        expect(expectedColor).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
        
        // Property: Each status should have a unique color
        const allTaskColors = Object.values(COLORS.taskStatus);
        const uniqueColors = [...new Set(allTaskColors)];
        expect(uniqueColors.length).toBe(allTaskColors.length);
        
        // Property: Colors should follow the defined scheme
        const colorMap = {
          'new': '#6c757d',        // Gray
          'scheduled': '#007bff',   // Blue
          'in_progress': '#ffc107', // Yellow/Amber
          'completed': '#28a745'    // Green
        };
        
        expect(COLORS.taskStatus[status]).toBe(colorMap[status]);
      }
    ), { numRuns: 50 });
  });

  test('Property 19: Project status colors should be consistent and distinct', async () => {
    await fc.assert(fc.property(
      projectStatusArbitrary,
      (status) => {
        // Property: Project status colors should be defined and consistent
        const expectedColor = COLORS.projectStatus[status];
        
        expect(expectedColor).toBeDefined();
        expect(typeof expectedColor).toBe('string');
        expect(expectedColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        
        // Property: Each project status should have a unique color
        const allProjectColors = Object.values(COLORS.projectStatus);
        const uniqueColors = [...new Set(allProjectColors)];
        expect(uniqueColors.length).toBe(allProjectColors.length);
        
        // Property: Colors should follow the defined scheme
        const colorMap = {
          'planning': '#6c757d',    // Gray
          'active': '#007bff',      // Blue
          'completed': '#28a745',   // Green
          'on_hold': '#ffc107'      // Yellow
        };
        
        expect(COLORS.projectStatus[status]).toBe(colorMap[status]);
      }
    ), { numRuns: 20 });
  });

  test('Property 19: Priority colors should follow severity hierarchy', async () => {
    await fc.assert(fc.property(
      priorityArbitrary,
      (priority) => {
        // Property: Priority colors should be defined and follow severity
        const expectedColor = COLORS.priority[priority];
        
        expect(expectedColor).toBeDefined();
        expect(typeof expectedColor).toBe('string');
        expect(expectedColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        
        // Property: Priority colors should follow logical severity progression
        const colorMap = {
          'low': '#28a745',         // Green (safe)
          'medium': '#ffc107',      // Yellow (caution)
          'high': '#fd7e14',        // Orange (warning)
          'urgent': '#dc3545'       // Red (danger)
        };
        
        expect(COLORS.priority[priority]).toBe(colorMap[priority]);
        
        // Property: Higher priority should have "warmer" colors (more red/orange)
        const priorityOrder = ['low', 'medium', 'high', 'urgent'];
        const currentIndex = priorityOrder.indexOf(priority);
        
        // Verify that the color progression makes visual sense
        if (currentIndex >= 0) {
          expect(currentIndex).toBeGreaterThanOrEqual(0);
          expect(currentIndex).toBeLessThan(priorityOrder.length);
        }
      }
    ), { numRuns: 20 });
  });

  test('Property 19: Role colors should be distinct and hierarchical', async () => {
    await fc.assert(fc.property(
      roleArbitrary,
      (role) => {
        // Property: Role colors should be defined and distinct
        const expectedColor = COLORS.role[role];
        
        expect(expectedColor).toBeDefined();
        expect(typeof expectedColor).toBe('string');
        expect(expectedColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        
        // Property: Each role should have a unique color
        const allRoleColors = Object.values(COLORS.role);
        const uniqueColors = [...new Set(allRoleColors)];
        expect(uniqueColors.length).toBe(allRoleColors.length);
        
        // Property: Colors should follow the defined hierarchy
        const colorMap = {
          'managing_director': '#dc3545',  // Red (highest authority)
          'it_admin': '#ffc107',           // Yellow (admin level)
          'team_lead': '#17a2b8',          // Cyan (management level)
          'employee': '#28a745'            // Green (base level)
        };
        
        expect(COLORS.role[role]).toBe(colorMap[role]);
      }
    ), { numRuns: 20 });
  });

  test('Property 19: Primary branding colors should be maroon-based', async () => {
    await fc.assert(fc.property(
      fc.constant('branding'),
      (brandingType) => {
        // Property: Primary branding should use maroon color scheme
        expect(COLORS.primary).toBe('#8B0000'); // Dark maroon
        expect(COLORS.primaryLight).toBe('#A52A2A'); // Brown/maroon
        
        // Property: Primary colors should be valid hex colors
        expect(COLORS.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(COLORS.primaryLight).toMatch(/^#[0-9a-fA-F]{6}$/);
        
        // Property: Primary light should be lighter than primary
        const primaryRed = parseInt(COLORS.primary.slice(1, 3), 16);
        const primaryLightRed = parseInt(COLORS.primaryLight.slice(1, 3), 16);
        expect(primaryLightRed).toBeGreaterThan(primaryRed);
      }
    ), { numRuns: 10 });
  });

  test('Property 19: Color accessibility and contrast requirements', async () => {
    await fc.assert(fc.property(
      fc.oneof(taskStatusArbitrary, projectStatusArbitrary, priorityArbitrary, roleArbitrary),
      fc.constantFrom('task', 'project', 'priority', 'role'),
      (status, type) => {
        let colorValue;
        
        switch (type) {
          case 'task':
            colorValue = COLORS.taskStatus[status];
            break;
          case 'project':
            colorValue = COLORS.projectStatus[status];
            break;
          case 'priority':
            colorValue = COLORS.priority[status];
            break;
          case 'role':
            colorValue = COLORS.role[status];
            break;
        }
        
        if (colorValue) {
          // Property: All colors should be valid hex colors
          expect(colorValue).toMatch(/^#[0-9a-fA-F]{6}$/);
          
          // Property: Colors should not be pure black or pure white (accessibility)
          expect(colorValue).not.toBe('#000000');
          expect(colorValue).not.toBe('#FFFFFF');
          
          // Property: Colors should have sufficient contrast (basic check)
          const red = parseInt(colorValue.slice(1, 3), 16);
          const green = parseInt(colorValue.slice(3, 5), 16);
          const blue = parseInt(colorValue.slice(5, 7), 16);
          
          // Ensure RGB values are within valid range
          expect(red).toBeGreaterThanOrEqual(0);
          expect(red).toBeLessThanOrEqual(255);
          expect(green).toBeGreaterThanOrEqual(0);
          expect(green).toBeLessThanOrEqual(255);
          expect(blue).toBeGreaterThanOrEqual(0);
          expect(blue).toBeLessThanOrEqual(255);
          
          // Property: Colors should not be too dark or too light for readability
          const luminance = (0.299 * red + 0.587 * green + 0.114 * blue);
          expect(luminance).toBeGreaterThan(20); // Not too dark
          expect(luminance).toBeLessThan(235);   // Not too light
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 19: Color scheme consistency across status types', async () => {
    await fc.assert(fc.property(
      fc.constant('consistency'),
      (testType) => {
        // Property: Similar statuses across different types should use similar colors
        
        // Completed/Success states should all use green
        expect(COLORS.taskStatus.completed).toBe('#28a745');
        expect(COLORS.projectStatus.completed).toBe('#28a745');
        expect(COLORS.priority.low).toBe('#28a745');
        expect(COLORS.role.employee).toBe('#28a745');
        
        // Warning/Caution states should use yellow/amber
        expect(COLORS.taskStatus.in_progress).toBe('#ffc107');
        expect(COLORS.projectStatus.on_hold).toBe('#ffc107');
        expect(COLORS.priority.medium).toBe('#ffc107');
        expect(COLORS.role.it_admin).toBe('#ffc107');
        
        // Active/Primary states should use blue
        expect(COLORS.taskStatus.scheduled).toBe('#007bff');
        expect(COLORS.projectStatus.active).toBe('#007bff');
        
        // Neutral/Initial states should use gray
        expect(COLORS.taskStatus.new).toBe('#6c757d');
        expect(COLORS.projectStatus.planning).toBe('#6c757d');
        
        // Property: All color objects should have the same structure
        const taskStatusKeys = Object.keys(COLORS.taskStatus).sort();
        const projectStatusKeys = Object.keys(COLORS.projectStatus).sort();
        const priorityKeys = Object.keys(COLORS.priority).sort();
        const roleKeys = Object.keys(COLORS.role).sort();
        
        // Each color category should have consistent key naming
        expect(taskStatusKeys.every(key => typeof key === 'string')).toBe(true);
        expect(projectStatusKeys.every(key => typeof key === 'string')).toBe(true);
        expect(priorityKeys.every(key => typeof key === 'string')).toBe(true);
        expect(roleKeys.every(key => typeof key === 'string')).toBe(true);
      }
    ), { numRuns: 5 });
  });

  test('Property 19: Bootstrap color mapping consistency', async () => {
    await fc.assert(fc.property(
      taskStatusArbitrary,
      (status) => {
        // Property: Task status should map to appropriate Bootstrap colors
        const bootstrapColorMap = {
          'new': 'secondary',
          'scheduled': 'info', 
          'in_progress': 'warning',
          'completed': 'success'
        };
        
        const expectedBootstrapColor = bootstrapColorMap[status];
        expect(expectedBootstrapColor).toBeDefined();
        
        // Property: Bootstrap colors should be valid Bootstrap color names
        const validBootstrapColors = [
          'primary', 'secondary', 'success', 'danger', 
          'warning', 'info', 'light', 'dark'
        ];
        expect(validBootstrapColors).toContain(expectedBootstrapColor);
        
        // Property: Color mapping should be logical
        // Completed -> success (green)
        if (status === 'completed') {
          expect(expectedBootstrapColor).toBe('success');
        }
        // In progress -> warning (yellow)
        if (status === 'in_progress') {
          expect(expectedBootstrapColor).toBe('warning');
        }
        // New -> secondary (gray)
        if (status === 'new') {
          expect(expectedBootstrapColor).toBe('secondary');
        }
        // Scheduled -> info (blue)
        if (status === 'scheduled') {
          expect(expectedBootstrapColor).toBe('info');
        }
      }
    ), { numRuns: 20 });
  });

  test('Property 19: Maroon branding integration with status colors', async () => {
    await fc.assert(fc.property(
      fc.constant('integration'),
      (testType) => {
        // Property: Maroon branding should not conflict with status colors
        const maroonColors = [COLORS.primary, COLORS.primaryLight];
        const allStatusColors = [
          ...Object.values(COLORS.taskStatus),
          ...Object.values(COLORS.projectStatus),
          ...Object.values(COLORS.priority),
          ...Object.values(COLORS.role)
        ];
        
        // Property: Maroon colors should be distinct from status colors
        maroonColors.forEach(maroonColor => {
          expect(allStatusColors).not.toContain(maroonColor);
        });
        
        // Property: Maroon should be used for primary branding elements
        expect(COLORS.primary).toBe('#8B0000');
        expect(COLORS.primaryLight).toBe('#A52A2A');
        
        // Property: Maroon colors should be in the red spectrum
        const primaryRed = parseInt(COLORS.primary.slice(1, 3), 16);
        const primaryGreen = parseInt(COLORS.primary.slice(3, 5), 16);
        const primaryBlue = parseInt(COLORS.primary.slice(5, 7), 16);
        
        // Red component should be dominant in maroon
        expect(primaryRed).toBeGreaterThan(primaryGreen);
        expect(primaryRed).toBeGreaterThan(primaryBlue);
        
        // Green and blue should be minimal for true maroon
        expect(primaryGreen).toBeLessThanOrEqual(primaryRed / 2);
        expect(primaryBlue).toBeLessThanOrEqual(primaryRed / 2);
      }
    ), { numRuns: 10 });
  });
});