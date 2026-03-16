import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../components/internal/error-boundary';
import { captureError } from '../components/internal/observability-provider';

// Mock the captureError function
jest.mock('../components/internal/observability-provider', () => ({
  captureError: jest.fn(),
}));

// Suppress console.error in tests to avoid noisy output from React's internal ErrorBoundary mechanisms
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// A component that renders without errors
const GoodChild = () => <div>All good here!</div>;

// A component that intentionally throws an error
const ProblemChild = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div>No problem yet!</div>;
};

describe('ErrorBoundary', () => {
  it('should render children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('All good here!')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    expect(captureError).not.toHaveBeenCalled();
  });

  it('should display fallback UI and call captureError exactly once when a child throws', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(captureError).toHaveBeenCalledTimes(1);
    expect(captureError).toHaveBeenCalledWith(expect.any(Error));
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('should allow retrying after an error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    // Initial state: error is shown
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(captureError).toHaveBeenCalledTimes(1);

    // Now, pretend the properties of the child changed so it doesn't throw
    // The ErrorBoundary's state is still { hasError: true }, so it should still show the fallback
    rerender(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    // Now the fallback should be gone and the "No problem yet!" should be visible
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    expect(screen.getByText('No problem yet!')).toBeInTheDocument();
  });
});
