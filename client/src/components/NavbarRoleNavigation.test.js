/**
 * Property-Based Tests for Role-Based Navigation
 * Feature: daily-activity-tracker, Property 6: Role-based navigation
 * Validates: Requirements 2.3, 2.4, 2.5
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import Navbar from './Navbar';

// Mock the auth service to avoid actual API calls
jest.mock('../services/authService', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshToken: jest.fn(),
  getToken: jest.fn(),
  verifyToken: jest.fn()
}));

// Mock the useAuth hook directly
const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

// Generator for valid user data with specific roles
const userWithRoleGenerator = (role) => fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
  lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
  email: fc.emailAddress(),
  role: fc.constant(role),
  department: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
  isActive: fc.constant(true)
});

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Property Tests: Role-Based Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 6: Role-based navigation - MD/IT_Admin should see all navigation options', () => {
    const adminRoles = ['managing_director', 'it_admin'];
    
    adminRoles.forEach(role => {
      fc.assert(
        fc.property(userWithRoleGenerator(role), (user) => {
          // Setup mock auth context for this test
          mockUseAuth.mockReturnValue({
            user,
            isAuthenticated: true,
            isLoading: false,
            getUserFullName: () => `${user.firstName} ${user.lastName}`,
            login: jest.fn(),
            logout: jest.fn()
          });

          const { container } = render(
            <TestWrapper>
              <Navbar />
            </TestWrapper>
          );

          // MD and IT Admin should see all navigation options
          const expectedNavItems = [
            'Dashboard',
            'Team Management',
            'Project Management', 
            'Task Assignment',
            'Reports',
            'System Settings'
          ];

          expectedNavItems.forEach(navItem => {
            const navElements = screen.getAllByText(navItem);
            expect(navElements.length).toBeGreaterThan(0);
            
            // Verify at least one is actually a navigation link
            const navLink = navElements.find(el => el.closest('a.nav-link'));
            expect(navLink).toBeTruthy();
          });

          // Verify the navigation is in the correct container
          const navList = container.querySelector('.navbar-nav.me-auto');
          expect(navList).toBeInTheDocument();
          
          // Should have 6 navigation items for admin roles
          const navItems = navList.querySelectorAll('.nav-item');
          expect(navItems).toHaveLength(6);

          cleanup();
          return true;
        }),
        { numRuns: 10 } // Reduced runs for stability
      );
    });
  });

  test('Property 6: Role-based navigation - Team Lead should see team-specific options', () => {
    fc.assert(
      fc.property(userWithRoleGenerator('team_lead'), (user) => {
        // Setup mock auth context for this test
        mockUseAuth.mockReturnValue({
          user,
          isAuthenticated: true,
          isLoading: false,
          getUserFullName: () => `${user.firstName} ${user.lastName}`,
          login: jest.fn(),
          logout: jest.fn()
        });

        const { container } = render(
          <TestWrapper>
            <Navbar />
          </TestWrapper>
        );

        // Team Lead should see team-specific navigation options
        const expectedNavItems = [
          'Dashboard',
          'My Team',
          'Team Projects',
          'Task Assignment',
          'Team Reports'
        ];

        expectedNavItems.forEach(navItem => {
          const navElements = screen.getAllByText(navItem);
          expect(navElements.length).toBeGreaterThan(0);
          
          // Verify at least one is actually a navigation link
          const navLink = navElements.find(el => el.closest('a.nav-link'));
          expect(navLink).toBeTruthy();
        });

        // Team Lead should NOT see admin-only options
        const adminOnlyItems = ['System Settings'];
        adminOnlyItems.forEach(adminItem => {
          expect(screen.queryByText(adminItem)).not.toBeInTheDocument();
        });

        // Should have 5 navigation items for team lead
        const navList = container.querySelector('.navbar-nav.me-auto');
        const navItems = navList.querySelectorAll('.nav-item');
        expect(navItems).toHaveLength(5);

        cleanup();
        return true;
      }),
      { numRuns: 10 } // Reduced runs for stability
    );
  });

  test('Property 6: Role-based navigation - Employee should see personal options only', () => {
    fc.assert(
      fc.property(userWithRoleGenerator('employee'), (user) => {
        // Setup mock auth context for this test
        mockUseAuth.mockReturnValue({
          user,
          isAuthenticated: true,
          isLoading: false,
          getUserFullName: () => `${user.firstName} ${user.lastName}`,
          login: jest.fn(),
          logout: jest.fn()
        });

        const { container } = render(
          <TestWrapper>
            <Navbar />
          </TestWrapper>
        );

        // Employee should see personal navigation options only
        const expectedNavItems = [
          'Dashboard',
          'My Tasks',
          'My Projects',
          'Calendar'
        ];

        expectedNavItems.forEach(navItem => {
          const navElements = screen.getAllByText(navItem);
          expect(navElements.length).toBeGreaterThan(0);
          
          // Verify at least one is actually a navigation link
          const navLink = navElements.find(el => el.closest('a.nav-link'));
          expect(navLink).toBeTruthy();
        });

        // Employee should NOT see management options
        const managementItems = [
          'Team Management', 
          'Project Management',
          'System Settings',
          'My Team',
          'Team Projects',
          'Team Reports'
        ];
        
        managementItems.forEach(mgmtItem => {
          expect(screen.queryByText(mgmtItem)).not.toBeInTheDocument();
        });

        // Should have 4 navigation items for employee
        const navList = container.querySelector('.navbar-nav.me-auto');
        const navItems = navList.querySelectorAll('.nav-item');
        expect(navItems).toHaveLength(4);

        cleanup();
        return true;
      }),
      { numRuns: 10 } // Reduced runs for stability
    );
  });

  test('Property 6: Navigation structure consistency - All roles should have proper navigation structure', () => {
    const allRoles = ['managing_director', 'it_admin', 'team_lead', 'employee'];
    
    allRoles.forEach(role => {
      fc.assert(
        fc.property(userWithRoleGenerator(role), (user) => {
          // Setup mock auth context for this test
          mockUseAuth.mockReturnValue({
            user,
            isAuthenticated: true,
            isLoading: false,
            getUserFullName: () => `${user.firstName} ${user.lastName}`,
            login: jest.fn(),
            logout: jest.fn()
          });

          const { container } = render(
            <TestWrapper>
              <Navbar />
            </TestWrapper>
          );

          // All roles should have Dashboard as first item
          const dashboardElements = screen.getAllByText('Dashboard');
          expect(dashboardElements.length).toBeGreaterThan(0);
          
          const dashboardLink = dashboardElements.find(el => el.closest('a[href="/dashboard"]'));
          expect(dashboardLink).toBeTruthy();

          // Navigation should be properly structured
          const navbar = container.querySelector('.navbar');
          expect(navbar).toBeInTheDocument();
          
          const navList = container.querySelector('.navbar-nav.me-auto');
          expect(navList).toBeInTheDocument();

          // All navigation items should have proper structure
          const navItems = navList.querySelectorAll('.nav-item');
          navItems.forEach(item => {
            const link = item.querySelector('a.nav-link');
            expect(link).toBeInTheDocument();
            
            const icon = link.querySelector('i');
            expect(icon).toBeInTheDocument();
            
            // Link should have proper href
            expect(link.getAttribute('href')).toMatch(/^\/[a-z-]+$/);
          });

          cleanup();
          return true;
        }),
        { numRuns: 5 } // Reduced runs for consistency test
      );
    });
  });
});

/**
 * **Validates: Requirements 2.3, 2.4, 2.5**
 * 
 * This test suite validates that:
 * 1. MD/IT_Admin users see all navigation options (Requirement 2.3)
 * 2. Team_Lead users see team-specific navigation options (Requirement 2.4)  
 * 3. Employee users see only personal navigation options (Requirement 2.5)
 * 4. Navigation structure is consistent across all roles
 * 5. Proper access control prevents unauthorized navigation options from appearing
 */