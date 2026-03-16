'use client';

import * as Sentry from '@sentry/browser';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ErrorEvent } from '@sentry/browser';

export function captureError(error: Error): void {
  if (!Sentry.isInitialized()) return;
  Sentry.captureException(error);
}

function beforeSend(event: ErrorEvent): ErrorEvent | null {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
  if (!event.request) return event;
  return { ...event, request: { ...event.request, url: '[Redacted]' } };
}

export default function ObservabilityProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({
      dsn,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      environment: process.env.NODE_ENV,
      beforeSend,
    });
  }, []);
  return <>{children}</>;
}
