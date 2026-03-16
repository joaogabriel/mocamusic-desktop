import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('@sentry/browser', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  isInitialized: jest.fn().mockReturnValue(false),
}));

import * as Sentry from '@sentry/browser';
import ObservabilityProvider, { captureError } from '@/components/internal/observability-provider';

const mockSentry = Sentry as {
  init: jest.Mock;
  captureException: jest.Mock;
  isInitialized: jest.Mock;
};

describe('ObservabilityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSentry.isInitialized.mockReturnValue(false);
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  it('renders children without errors when DSN is empty', () => {
    const { getByText } = render(
      <ObservabilityProvider>
        <span>child content</span>
      </ObservabilityProvider>
    );
    expect(getByText('child content')).toBeInTheDocument();
  });

  it('does not call Sentry.init when DSN is absent', () => {
    render(
      <ObservabilityProvider>
        <span>child</span>
      </ObservabilityProvider>
    );
    expect(mockSentry.init).not.toHaveBeenCalled();
  });

  it('calls Sentry.init with DSN when NEXT_PUBLIC_SENTRY_DSN is set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    render(
      <ObservabilityProvider>
        <span>child</span>
      </ObservabilityProvider>
    );
    expect(mockSentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://test@sentry.io/123' })
    );
  });
});

describe('captureError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSentry.isInitialized.mockReturnValue(false);
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  it('does not throw when Sentry is not initialized', () => {
    expect(() => captureError(new Error('test error'))).not.toThrow();
  });

  it('does not call Sentry.captureException when not initialized', () => {
    captureError(new Error('test error'));
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('is callable with any Error instance', () => {
    const error = new TypeError('type error');
    expect(() => captureError(error)).not.toThrow();
  });

  it('calls Sentry.captureException when initialized', () => {
    mockSentry.isInitialized.mockReturnValue(true);
    const error = new Error('captured error');
    captureError(error);
    expect(mockSentry.captureException).toHaveBeenCalledWith(error);
  });
});
