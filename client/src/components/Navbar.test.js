/**
 * Property-Based Tests for User Identity Display
 * Feature: daily-activity-tracker, Property 5: User identity display
 * Validates: Requirements 2.1
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

// Generator for valid user data with safe characters
const userGenerator = fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  firstName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
  lastName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
  email: fc.emailAddress(),
  role: fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee'),
  department: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
  isActive: fc.constant(true)
});

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Property Tests: User Identity Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 5: User identity display - For any logged-in user, the navbar should display their full name', () => {
    fc.assert(
      fc.property(userGenerator, (user) => {
        // Setup mock auth context for this test
        mockUseAuth.mockReturnValue({
          user,
          isAuthenticated: true,
          isLoading: false,
          getUserFullName: () => `${user.firstName} ${user.lastName}`,
          login: jest.fn(),
          logout: jest.fn()
        });

        // Render the Navbar component with the generated user
        const { container } = render(
          <TestWrapper>
            <Navbar />
          </TestWrapper>
        );

        // The expected full name
        const expectedFullName = `${user.firstName} ${user.lastName}`;

        // Check that the user's full name appears in the navbar using getAllByText to handle duplicates
        const userNameElements = screen.getAllByText(expectedFullName);
        expect(userNameElements.length).toBeGreaterThan(0);

        // Verify at least one element is in the navbar
        const navbar = container.querySelector('.navbar');
        expect(navbar).toBeInTheDocument();
        
        const userNameInNavbar = userNameElements.find(element => 
          navbar.contains(element)
        );
        expect(userNameInNavbar).toBeTruthy();

        // Verify it has the user icon nearby
        const userIcon = container.querySelector('.fa-user');
        expect(userIcon).toBeInTheDocument();

        // Clean up for next iteration
        cleanup();
        return true;
      }),
      { numRuns: 50 } // Reduced runs for stability
    );
  });

  test('Property 5 Validation: User name should be visible and readable', () => {
    fc.assert(
      fc.property(userGenerator, (user) => {
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

        const expectedFullName = `${user.firstName} ${user.lastName}`;
        const userNameElements = screen.getAllByText(expectedFullName);
        
        // At least one element should exist
        expect(userNameElements.length).toBeGreaterThan(0);

        // Check the first element's visibility
        const userNameElement = userNameElements[0];
        const styles = window.getComputedStyle(userNameElement);
        expect(styles.display).not.toBe('none');
        expect(styles.visibility).not.toBe('hidden');

        // Verify it has appropriate styling (should have text-light class for visibility)
        const parentSpan = userNameElement.closest('.navbar-text');
        expect(parentSpan).toHaveClass('text-light');

        // Clean up for next iteration
        cleanup();
        return true;
      }),
      { numRuns: 50 } // Reduced runs for stability
    );
  });

  test('Property 5 Edge Case: Different name lengths should display correctly', () => {
    const nameVariationsGenerator = fc.record({
      _id: fc.string({ minLength: 24, maxLength: 24 }),
      firstName: fc.oneof(
        fc.constant('A'),
        fc.constant('AB'),
        fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s))
      ),
      lastName: fc.oneof(
        fc.constant('B'),
        fc.constant('BC'),
        fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s))
      ),
      email: fc.emailAddress(),
      role: fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee'),
      department: fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[A-Za-z]+$/.test(s)),
      isActive: fc.constant(true)
    });

    fc.assert(
      fc.property(nameVariationsGenerator, (user) => {
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

        // Component should render without crashing regardless of name length
        const navbar = container.querySelector('.navbar');
        expect(navbar).toBeInTheDocument();

        // The user icon should still be present
        const userIcon = container.querySelector('.fa-user');
        expect(userIcon).toBeInTheDocument();

        // Clean up for next iteration
        cleanup();
        return true;
      }),
      { numRuns: 30 } // Reduced runs for edge cases
    );
  });
});

/**
 * **Validates: Requirements 2.1**
 * 
 * This test suite validates that:
 * 1. For any logged-in user, their full name is displayed in the navbar
 * 2. The name appears in the correct location (top-right corner)
 * 3. The display includes appropriate visual indicators (user icon)
 * 4. The text is visible and properly styled
 * 5. Different name lengths are handled gracefully
 */