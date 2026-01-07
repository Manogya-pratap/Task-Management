/**
 * Property-Based Tests for User Identity Display
 * Feature: daily-activity-tracker, Property 5: User identity display
 * Validates: Requirements 2.1
 */

const fc = require('fast-check');
const { render, screen } = require('@testing-library/react');
const { BrowserRouter } = require('react-router-dom');
const React = require('react');
const { AuthProvider } = require('../../client/src/contexts/AuthContext');
const Navbar = require('../../client/src/components/Navbar').default;

// Mock the auth service to avoid actual API calls
jest.mock('../../client/src/services/authService', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshToken: jest.fn()
}));

// Generator for valid user data
const userGenerator = fc.record({
  _id: fc.string({ minLength: 24, maxLength: 24 }),
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  email: fc.emailAddress(),
  role: fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee'),
  department: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  isActive: fc.constant(true)
});

// Test wrapper component that provides auth context
const TestWrapper = ({ user, children }) => {
  const mockAuthContext = {
    user,
    isAuthenticated: !!user,
    isLoading: false,
    getUserFullName: () => user ? `${user.firstName} ${user.lastName}` : '',
    login: jest.fn(),
    logout: jest.fn()
  };

  return React.createElement(
    BrowserRouter,
    null,
    React.createElement(
      AuthProvider,
      { value: mockAuthContext },
      children
    )
  );
};

describe('Property Tests: User Identity Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Property 5: User identity display - For any logged-in user, the navbar should display their full name in the top-right corner', () => {
    fc.assert(
      fc.property(userGenerator, (user) => {
        // Render the Navbar component with the generated user
        const { container } = render(
          React.createElement(
            TestWrapper,
            { user },
            React.createElement(Navbar)
          )
        );

        // The expected full name
        const expectedFullName = `${user.firstName} ${user.lastName}`;

        // Check that the user's full name appears in the navbar
        const userNameElement = screen.getByText(expectedFullName);
        expect(userNameElement).toBeInTheDocument();

        // Verify it's in the navbar (has navbar-text class or is within navbar)
        const navbar = container.querySelector('.navbar');
        expect(navbar).toContainElement(userNameElement);

        // Verify it's positioned correctly (should be in the right side of navbar)
        const navbarRight = container.querySelector('.navbar-nav.ms-auto');
        expect(navbarRight).toContainElement(userNameElement);

        // Verify it has the user icon
        const userIcon = container.querySelector('.fa-user');
        expect(userIcon).toBeInTheDocument();
        expect(userIcon.parentElement).toContainElement(userNameElement);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('Property 5 Edge Case: Empty or whitespace names should still display correctly', () => {
    const edgeCaseUserGenerator = fc.record({
      _id: fc.string({ minLength: 24, maxLength: 24 }),
      firstName: fc.constantFrom('', ' ', '  ', '\t', '\n'),
      lastName: fc.constantFrom('', ' ', '  ', '\t', '\n'),
      email: fc.emailAddress(),
      role: fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee'),
      department: fc.string({ minLength: 1, maxLength: 30 }),
      isActive: fc.constant(true)
    });

    fc.assert(
      fc.property(edgeCaseUserGenerator, (user) => {
        const { container } = render(
          React.createElement(
            TestWrapper,
            { user },
            React.createElement(Navbar)
          )
        );

        // Even with empty names, the component should render without crashing
        const navbar = container.querySelector('.navbar');
        expect(navbar).toBeInTheDocument();

        // The user icon should still be present
        const userIcon = container.querySelector('.fa-user');
        expect(userIcon).toBeInTheDocument();

        return true;
      }),
      { numRuns: 50 }
    );
  });

  test('Property 5 Validation: User name should be visible and readable', () => {
    fc.assert(
      fc.property(userGenerator, (user) => {
        const { container } = render(
          React.createElement(
            TestWrapper,
            { user },
            React.createElement(Navbar)
          )
        );

        const expectedFullName = `${user.firstName} ${user.lastName}`;
        const userNameElement = screen.getByText(expectedFullName);

        // Verify the text is not hidden or has zero opacity
        const styles = window.getComputedStyle(userNameElement);
        expect(styles.display).not.toBe('none');
        expect(styles.visibility).not.toBe('hidden');

        // Verify it has appropriate styling (should have text-light class for visibility)
        const parentSpan = userNameElement.closest('.navbar-text');
        expect(parentSpan).toHaveClass('text-light');

        return true;
      }),
      { numRuns: 100 }
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
 * 5. Edge cases with empty/whitespace names are handled gracefully
 */