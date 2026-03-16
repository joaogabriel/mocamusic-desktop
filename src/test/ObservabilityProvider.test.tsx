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

describe('beforeSend hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSentry.isInitialized.mockReturnValue(false);
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  it('passes beforeSend callback to Sentry.init', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    render(
      <ObservabilityProvider>
        <span>child</span>
      </ObservabilityProvider>
    );
    expect(mockSentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ beforeSend: expect.any(Function) })
    );
  });

  it('beforeSend returns null when NEXT_PUBLIC_SENTRY_DSN is absent', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    render(
      <ObservabilityProvider>
        <span>child</span>
      </ObservabilityProvider>
    );
    const { beforeSend } = mockSentry.init.mock.calls[0][0];
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const event = { request: { url: 'https://user-input.com' } };
    const result = beforeSend(event, {});
    expect(result).toBeNull();
  });

  it('beforeSend redacts request.url when DSN is present', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    render(
      <ObservabilityProvider>
        <span>child</span>
      </ObservabilityProvider>
    );
    const { beforeSend } = mockSentry.init.mock.calls[0][0];
    const event = { request: { url: 'https://user-input.com' } };
    const result = beforeSend(event, {});
    expect(result).not.toBeNull();
    expect(result.request.url).toBe('[Redacted]');
  });

  it('beforeSend returns event without modification when request is absent', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    render(
      <ObservabilityProvider>
        <span>child</span>
      </ObservabilityProvider>
    );
    const { beforeSend } = mockSentry.init.mock.calls[0][0];
    const event = { message: 'some error' };
    const result = beforeSend(event, {});
    expect(result).toEqual({ message: 'some error' });
  });
});
