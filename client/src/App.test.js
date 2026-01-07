import { render, screen } from '@testing-library/react';
import App from './App';

test('renders welcome message', () => {
  render(<App />);
  const welcomeElement = screen.getByText(/Welcome to Daily Activity Tracker/i);
  expect(welcomeElement).toBeInTheDocument();
});

test('renders setup complete message', () => {
  render(<App />);
  const setupElement = screen.getByText(/Setup Complete!/i);
  expect(setupElement).toBeInTheDocument();
});

test('renders current date in navbar', () => {
  render(<App />);
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const dateElement = screen.getByText(currentDate);
  expect(dateElement).toBeInTheDocument();
});