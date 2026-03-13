'use client';

import React, { Component, ReactNode } from 'react';
import { captureError } from './observability-provider';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    captureError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center" data-testid="error-boundary-fallback">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-4">
            Ocorreu um problema ao renderizar esta parte da aplicação.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
