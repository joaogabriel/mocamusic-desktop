'use client';

import * as Sentry from '@sentry/browser';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export function captureError(error: Error): void {
  if (!Sentry.isInitialized()) return;
  Sentry.captureException(error);
}

export function logInfo(message: string, attributes?: Record<string, string>): void {
  if (!Sentry.isInitialized()) return;
  Sentry.logger.info(message, attributes);
}

export function countMetric(name: string, value = 1): void {
  if (!Sentry.isInitialized()) return;
  Sentry.metrics.count(name, value);
}

export default function ObservabilityProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({
      dsn,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      environment: process.env.NODE_ENV,
      integrations: [
        Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
      ],
      enableLogs: true,
    });
    Sentry.metrics.count('app_opened');
  }, []);
  return <>{children}</>;
}
